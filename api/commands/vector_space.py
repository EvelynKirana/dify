import csv
import json
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Any

import click
import httpx
import sqlalchemy as sa
from sqlalchemy import func, select

from configs import dify_config
from core.rag.datasource.vdb.vector_type import VectorType
from core.rag.index_processor.constant.index_type import IndexStructureType, IndexTechniqueType
from extensions.ext_database import db
from models.dataset import (
    ChildChunk,
    Dataset,
    DatasetCollectionBinding,
    DocumentSegment,
    DocumentSegmentSummary,
    SegmentAttachmentBinding,
    TidbAuthBinding,
)
from models.dataset import Document as DatasetDocument
from models.enums import IndexingStatus, SegmentStatus, SummaryStatus, TidbAuthBindingStatus
from models.model import App, AppAnnotationSetting, MessageAnnotation

COMMON_EMBEDDING_MODEL_DIMS = {
    # OpenAI
    "text-embedding-ada-002": 1536,
    "text-embedding-3-small": 1536,
    "text-embedding-3-large": 3072,
    # Cohere
    "embed-english-v3.0": 1024,
    "embed-multilingual-v3.0": 1024,
    "embed-english-light-v3.0": 384,
    "embed-multilingual-light-v3.0": 384,
    # Google
    "embedding-001": 768,
    "text-embedding-004": 768,
    # Voyage
    "voyage-2": 1024,
    "voyage-3": 1024,
    "voyage-3-lite": 512,
    "voyage-large-2": 1536,
    "voyage-code-2": 1536,
    # BAAI BGE
    "bge-small-en": 384,
    "bge-small-en-v1.5": 384,
    "bge-small-zh": 512,
    "bge-small-zh-v1.5": 512,
    "bge-base-en": 768,
    "bge-base-en-v1.5": 768,
    "bge-base-zh": 768,
    "bge-base-zh-v1.5": 768,
    "bge-large-en": 1024,
    "bge-large-en-v1.5": 1024,
    "bge-large-zh": 1024,
    "bge-large-zh-v1.5": 1024,
    "bge-m3": 1024,
    # E5
    "multilingual-e5-small": 384,
    "multilingual-e5-base": 768,
    "multilingual-e5-large": 1024,
    "e5-small-v2": 384,
    "e5-base-v2": 768,
    "e5-large-v2": 1024,
    # M3E
    "m3e-small": 512,
    "m3e-base": 768,
    "m3e-large": 1024,
    # Jina
    "jina-embeddings-v2-small-en": 512,
    "jina-embeddings-v2-base-en": 768,
    "jina-embeddings-v2-base-zh": 768,
    "jina-embeddings-v3": 1024,
}


@dataclass(frozen=True)
class CollectionPointStats:
    collection_name: str
    source_type: str
    source_id: str
    model_provider: str | None
    model_name: str | None
    segment_points: int = 0
    child_chunk_points: int = 0
    summary_points: int = 0
    attachment_points: int = 0
    annotation_points: int = 0

    @property
    def total_points(self) -> int:
        return (
            self.segment_points
            + self.child_chunk_points
            + self.summary_points
            + self.attachment_points
            + self.annotation_points
        )


def _parse_overheads(value: str) -> list[int]:
    overheads = []
    for item in value.split(","):
        item = item.strip()
        if not item:
            continue
        overheads.append(int(item))
    if not overheads:
        raise click.BadParameter("At least one overhead is required.")
    return overheads


def _normalize_model_name(model_name: str) -> str:
    return model_name.strip().split("/")[-1]


def _tidb_storage_usage_bytes(binding: TidbAuthBinding, timeout: float) -> int:
    if not binding.qdrant_endpoint:
        raise ValueError("qdrant_endpoint is empty")

    endpoint = binding.qdrant_endpoint.rstrip("/")
    with httpx.Client(timeout=timeout, verify=False) as client:
        response = client.get(f"{endpoint}/cluster", headers={"api-key": f"{binding.account}:{binding.password}"})
        response.raise_for_status()
        data = response.json()

    storage = data.get("usage", {}).get("storage", {})
    row_based = int(storage.get("row_based") or 0)
    columnar = int(storage.get("columnar") or 0)
    return row_based + columnar


def _extract_vector_size(collection_payload: dict[str, Any]) -> int | None:
    vectors = (
        collection_payload.get("result", {})
        .get("config", {})
        .get("params", {})
        .get("vectors")
    )
    if isinstance(vectors, dict):
        size = vectors.get("size")
        if isinstance(size, int):
            return size
        for vector_config in vectors.values():
            if isinstance(vector_config, dict) and isinstance(vector_config.get("size"), int):
                return vector_config["size"]
    return None


def _qdrant_collection_dim(
    binding: TidbAuthBinding,
    collection_name: str,
    timeout: float,
    dim_cache: dict[str, int | None],
) -> int | None:
    if collection_name in dim_cache:
        return dim_cache[collection_name]
    if not binding.qdrant_endpoint:
        dim_cache[collection_name] = None
        return None

    endpoint = binding.qdrant_endpoint.rstrip("/")
    try:
        with httpx.Client(timeout=timeout, verify=False) as client:
            response = client.get(
                f"{endpoint}/collections/{collection_name}",
                headers={"api-key": f"{binding.account}:{binding.password}"},
            )
            if response.status_code == 404:
                dim_cache[collection_name] = None
                return None
            response.raise_for_status()
            dim = _extract_vector_size(response.json())
            dim_cache[collection_name] = dim
            return dim
    except Exception:
        dim_cache[collection_name] = None
        return None


def _dataset_vector_type(dataset: Dataset) -> str | None:
    if dataset.index_struct_dict:
        return dataset.index_struct_dict.get("type")
    return dify_config.VECTOR_STORE


def _dataset_collection_name(dataset: Dataset) -> str:
    if dataset.index_struct_dict:
        vector_store = dataset.index_struct_dict.get("vector_store") or {}
        collection_name = vector_store.get("class_prefix")
        if collection_name:
            return collection_name
    if dataset.collection_binding_id:
        binding = db.session.get(DatasetCollectionBinding, dataset.collection_binding_id)
        if binding:
            return binding.collection_name
    return Dataset.gen_collection_name_by_id(dataset.id)


def _active_tidb_bindings(tenant_ids: tuple[str, ...], limit: int, offset: int) -> list[TidbAuthBinding]:
    stmt = (
        select(TidbAuthBinding)
        .where(
            TidbAuthBinding.tenant_id.is_not(None),
            TidbAuthBinding.active == True,
            TidbAuthBinding.status == TidbAuthBindingStatus.ACTIVE,
        )
        .order_by(TidbAuthBinding.created_at.desc())
    )
    if tenant_ids:
        stmt = stmt.where(TidbAuthBinding.tenant_id.in_(tenant_ids))
    else:
        stmt = stmt.limit(limit).offset(offset)
    return list(db.session.scalars(stmt).all())


def _completed_document_filter() -> tuple[Any, ...]:
    return (
        DatasetDocument.indexing_status == IndexingStatus.COMPLETED,
        DatasetDocument.enabled == True,
        DatasetDocument.archived == False,
    )


def _completed_segment_filter() -> tuple[Any, ...]:
    return (
        DocumentSegment.status == SegmentStatus.COMPLETED,
        DocumentSegment.enabled == True,
        DocumentSegment.index_node_id.is_not(None),
    )


def _count_dataset_points(dataset: Dataset) -> CollectionPointStats:
    segment_points = (
        db.session.scalar(
            select(func.count(DocumentSegment.id))
            .join(DatasetDocument, DatasetDocument.id == DocumentSegment.document_id)
            .where(
                DocumentSegment.tenant_id == dataset.tenant_id,
                DocumentSegment.dataset_id == dataset.id,
                DatasetDocument.doc_form != IndexStructureType.PARENT_CHILD_INDEX,
                *_completed_document_filter(),
                *_completed_segment_filter(),
            )
        )
        or 0
    )

    child_chunk_points = (
        db.session.scalar(
            select(func.count(ChildChunk.id))
            .join(DatasetDocument, DatasetDocument.id == ChildChunk.document_id)
            .where(
                ChildChunk.tenant_id == dataset.tenant_id,
                ChildChunk.dataset_id == dataset.id,
                ChildChunk.index_node_id.is_not(None),
                *_completed_document_filter(),
            )
        )
        or 0
    )

    summary_points = (
        db.session.scalar(
            select(func.count(DocumentSegmentSummary.id))
            .join(DatasetDocument, DatasetDocument.id == DocumentSegmentSummary.document_id)
            .where(
                DocumentSegmentSummary.dataset_id == dataset.id,
                DocumentSegmentSummary.enabled == True,
                DocumentSegmentSummary.status == SummaryStatus.COMPLETED,
                DocumentSegmentSummary.summary_index_node_id.is_not(None),
                *_completed_document_filter(),
            )
        )
        or 0
    )

    attachment_points = 0
    if dataset.is_multimodal:
        attachment_points = (
            db.session.scalar(
                select(func.count(sa.distinct(SegmentAttachmentBinding.attachment_id)))
                .join(DocumentSegment, DocumentSegment.id == SegmentAttachmentBinding.segment_id)
                .join(DatasetDocument, DatasetDocument.id == SegmentAttachmentBinding.document_id)
                .where(
                    SegmentAttachmentBinding.tenant_id == dataset.tenant_id,
                    SegmentAttachmentBinding.dataset_id == dataset.id,
                    *_completed_document_filter(),
                    *_completed_segment_filter(),
                )
            )
            or 0
        )

    return CollectionPointStats(
        collection_name=_dataset_collection_name(dataset),
        source_type="dataset",
        source_id=dataset.id,
        model_provider=dataset.embedding_model_provider,
        model_name=dataset.embedding_model,
        segment_points=int(segment_points),
        child_chunk_points=int(child_chunk_points),
        summary_points=int(summary_points),
        attachment_points=int(attachment_points),
    )


def _dataset_stats_for_tenant(tenant_id: str) -> list[CollectionPointStats]:
    datasets = db.session.scalars(
        select(Dataset).where(
            Dataset.tenant_id == tenant_id,
            Dataset.indexing_technique == IndexTechniqueType.HIGH_QUALITY,
        )
    ).all()

    stats = []
    for dataset in datasets:
        if _dataset_vector_type(dataset) != VectorType.TIDB_ON_QDRANT:
            continue
        dataset_stats = _count_dataset_points(dataset)
        if dataset_stats.total_points > 0:
            stats.append(dataset_stats)
    return stats


def _annotation_stats_for_tenant(tenant_id: str) -> list[CollectionPointStats]:
    rows = db.session.execute(
        select(
            App.id,
            DatasetCollectionBinding.provider_name,
            DatasetCollectionBinding.model_name,
            DatasetCollectionBinding.collection_name,
            func.count(MessageAnnotation.id),
        )
        .join(AppAnnotationSetting, AppAnnotationSetting.app_id == App.id)
        .join(DatasetCollectionBinding, DatasetCollectionBinding.id == AppAnnotationSetting.collection_binding_id)
        .join(MessageAnnotation, MessageAnnotation.app_id == App.id)
        .where(App.tenant_id == tenant_id)
        .group_by(
            App.id,
            DatasetCollectionBinding.provider_name,
            DatasetCollectionBinding.model_name,
            DatasetCollectionBinding.collection_name,
        )
    ).all()

    return [
        CollectionPointStats(
            collection_name=row[3],
            source_type="annotation",
            source_id=row[0],
            model_provider=row[1],
            model_name=row[2],
            annotation_points=int(row[4] or 0),
        )
        for row in rows
        if int(row[4] or 0) > 0
    ]


def _resolve_dim(
    stat: CollectionPointStats,
    binding: TidbAuthBinding,
    default_dim: int,
    fetch_qdrant_dim: bool,
    timeout: float,
    dim_cache: dict[str, int | None],
) -> tuple[int, str]:
    if stat.model_provider and stat.model_name:
        builtin_dim = COMMON_EMBEDDING_MODEL_DIMS.get(_normalize_model_name(stat.model_name))
        if builtin_dim:
            return builtin_dim, "builtin_model_map"

    if fetch_qdrant_dim:
        qdrant_dim = _qdrant_collection_dim(binding, stat.collection_name, timeout, dim_cache)
        if qdrant_dim:
            return qdrant_dim, "qdrant"

    return default_dim, "default"


def _mb(value: int | float | Decimal) -> float:
    return round(float(value) / 1024 / 1024, 4)


def _log(message: str, quiet: bool) -> None:
    if not quiet:
        click.echo(message, err=True)


@click.command(
    "sample-vector-space-usage",
    help="Sample TiDB vector storage usage and compare it with local formula estimates.",
)
@click.option("--tenant-id", multiple=True, help="Tenant ID to sample. Can be repeated.")
@click.option("--limit", default=20, show_default=True, help="Number of active TiDB tenants to sample.")
@click.option("--offset", default=0, show_default=True, help="Offset when sampling active TiDB tenants.")
@click.option("--default-dim", default=3072, show_default=True, help="Fallback embedding dimension.")
@click.option(
    "--overheads",
    default="3584,5120,8192",
    show_default=True,
    help="Comma-separated per-point overhead bytes to compare.",
)
@click.option("--fetch-qdrant-dim/--no-fetch-qdrant-dim", default=True, show_default=True)
@click.option("--include-annotations/--exclude-annotations", default=True, show_default=True)
@click.option("--timeout", default=10.0, show_default=True, help="HTTP timeout for TiDB/Qdrant calls.")
@click.option("--output", type=click.Path(dir_okay=False, path_type=Path), help="CSV output path. Defaults to stdout.")
@click.option("--quiet", is_flag=True, help="Suppress progress logs. CSV output is unaffected.")
def sample_vector_space_usage(
    tenant_id: tuple[str, ...],
    limit: int,
    offset: int,
    default_dim: int,
    overheads: str,
    fetch_qdrant_dim: bool,
    include_annotations: bool,
    timeout: float,
    output: Path | None,
    quiet: bool,
):
    overhead_values = _parse_overheads(overheads)
    bindings = _active_tidb_bindings(tenant_id, limit, offset)
    sample_scope = f" for tenant_id={','.join(tenant_id)}" if tenant_id else f" with limit={limit}, offset={offset}"
    _log(
        f"Sampling {len(bindings)} active TiDB binding(s){sample_scope}.",
        quiet,
    )
    if not bindings:
        _log("No active TiDB bindings found. Nothing to sample.", quiet)

    fieldnames = [
        "tenant_id",
        "cluster_id",
        "tidb_actual_mb",
        "total_points",
        "segment_points",
        "child_chunk_points",
        "summary_points",
        "attachment_points",
        "annotation_points",
        "collection_count",
        "dim_sources",
        "dims",
        "errors",
    ]
    for overhead in overhead_values:
        fieldnames.extend(
            [
                f"estimated_mb_o{overhead}",
                f"diff_mb_o{overhead}",
                f"ratio_o{overhead}",
            ]
        )

    output_file = output.open("w", newline="") if output else None
    try:
        writer = csv.DictWriter(output_file or click.get_text_stream("stdout"), fieldnames=fieldnames)
        writer.writeheader()

        for index, binding in enumerate(bindings, start=1):
            assert binding.tenant_id is not None
            tenant = binding.tenant_id
            errors = []
            dim_cache: dict[str, int | None] = {}
            _log(f"[{index}/{len(bindings)}] tenant={tenant} cluster={binding.cluster_id}: fetching TiDB usage", quiet)

            try:
                actual_bytes = _tidb_storage_usage_bytes(binding, timeout)
                _log(
                    f"[{index}/{len(bindings)}] tenant={tenant}: TiDB actual={_mb(actual_bytes)} MB",
                    quiet,
                )
            except Exception as exc:
                actual_bytes = 0
                errors.append(f"tidb_usage:{exc.__class__.__name__}:{exc}")
                _log(
                    f"[{index}/{len(bindings)}] tenant={tenant}: failed to fetch TiDB usage: "
                    f"{exc.__class__.__name__}: {exc}",
                    quiet,
                )

            _log(f"[{index}/{len(bindings)}] tenant={tenant}: counting local vector points", quiet)
            collection_stats = _dataset_stats_for_tenant(tenant)
            if include_annotations:
                collection_stats.extend(_annotation_stats_for_tenant(tenant))

            total_points = 0
            segment_points = 0
            child_chunk_points = 0
            summary_points = 0
            attachment_points = 0
            annotation_points = 0
            dim_sources: dict[str, int] = {}
            dims: dict[str, int] = {}
            estimated_by_overhead = dict.fromkeys(overhead_values, 0)

            for stat in collection_stats:
                dim, dim_source = _resolve_dim(
                    stat,
                    binding,
                    default_dim,
                    fetch_qdrant_dim,
                    timeout,
                    dim_cache,
                )
                dim_sources[dim_source] = dim_sources.get(dim_source, 0) + 1
                dims[str(dim)] = dims.get(str(dim), 0) + stat.total_points

                total_points += stat.total_points
                segment_points += stat.segment_points
                child_chunk_points += stat.child_chunk_points
                summary_points += stat.summary_points
                attachment_points += stat.attachment_points
                annotation_points += stat.annotation_points

                for overhead in overhead_values:
                    estimated_by_overhead[overhead] += stat.total_points * (dim * 4 + overhead)

            _log(
                f"[{index}/{len(bindings)}] tenant={tenant}: points={total_points}, "
                f"collections={len(collection_stats)}, dim_sources={json.dumps(dim_sources, sort_keys=True)}",
                quiet,
            )

            row: dict[str, Any] = {
                "tenant_id": tenant,
                "cluster_id": binding.cluster_id,
                "tidb_actual_mb": _mb(actual_bytes),
                "total_points": total_points,
                "segment_points": segment_points,
                "child_chunk_points": child_chunk_points,
                "summary_points": summary_points,
                "attachment_points": attachment_points,
                "annotation_points": annotation_points,
                "collection_count": len(collection_stats),
                "dim_sources": json.dumps(dim_sources, sort_keys=True),
                "dims": json.dumps(dims, sort_keys=True),
                "errors": ";".join(errors),
            }

            for overhead, estimated_bytes in estimated_by_overhead.items():
                diff_bytes = estimated_bytes - actual_bytes
                ratio = round(estimated_bytes / actual_bytes, 6) if actual_bytes > 0 else ""
                row[f"estimated_mb_o{overhead}"] = _mb(estimated_bytes)
                row[f"diff_mb_o{overhead}"] = _mb(diff_bytes)
                row[f"ratio_o{overhead}"] = ratio

            writer.writerow(row)
            _log(f"[{index}/{len(bindings)}] tenant={tenant}: row written", quiet)
    finally:
        if output_file:
            output_file.close()

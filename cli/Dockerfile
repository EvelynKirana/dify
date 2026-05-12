# difyctl container image.
#
# Build:
#   docker build --build-arg VERSION=<tag> -f cli/Dockerfile -t ghcr.io/langgenius/difyctl:<tag> cli/
#
# The image installs from the published npm package, so multi-arch is handled by
# the base image (node:22-alpine ships linux/amd64 + linux/arm64) and the npm
# package contains the platform-agnostic ESM bundle plus napi-rs prebuilds for
# both targets.

FROM node:22-alpine

ARG VERSION
RUN test -n "$VERSION" || (echo "VERSION build-arg is required" >&2 && exit 1) \
    && npm install -g --no-fund --no-audit "@langgenius/difyctl@${VERSION}" \
    && npm cache clean --force

ENTRYPOINT ["difyctl"]
CMD ["--help"]

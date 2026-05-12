import type { PrintFlags } from '../../../printers/printer.js'
import { JsonYamlPrintFlags } from '../../../printers/format-json-yaml.js'
import { NamePrintFlags } from '../../../printers/format-name.js'
import { TablePrintFlags } from '../../../printers/format-table.js'
import { CompositePrintFlags } from '../../../printers/printer.js'
import { WORKSPACE_MODE_KEY, workspaceNameHandler, workspaceTableHandler } from './handlers.js'

export class WorkspacePrintFlags extends CompositePrintFlags {
  private readonly jsonYaml = new JsonYamlPrintFlags()
  private readonly table = new TablePrintFlags()
  private readonly name = new NamePrintFlags()

  constructor(currentId: string) {
    super()
    this.table.register(workspaceTableHandler(currentId), WORKSPACE_MODE_KEY)
    this.name.register(workspaceNameHandler, WORKSPACE_MODE_KEY)
  }

  protected families(): readonly PrintFlags[] {
    return [this.jsonYaml, this.name, this.table]
  }
}

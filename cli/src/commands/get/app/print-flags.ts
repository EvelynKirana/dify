import type { PrintFlags } from '../../../printers/printer.js'
import { JsonYamlPrintFlags } from '../../../printers/format-json-yaml.js'
import { NamePrintFlags } from '../../../printers/format-name.js'
import { TablePrintFlags } from '../../../printers/format-table.js'
import { CompositePrintFlags } from '../../../printers/printer.js'
import { APP_MODE_KEY, appNameHandler, appTableHandler } from './handlers.js'

export class AppPrintFlags extends CompositePrintFlags {
  private readonly jsonYaml = new JsonYamlPrintFlags()
  private readonly table = new TablePrintFlags()
  private readonly name = new NamePrintFlags()

  constructor() {
    super()
    this.table.register(appTableHandler, APP_MODE_KEY)
    this.name.register(appNameHandler, APP_MODE_KEY)
  }

  protected families(): readonly PrintFlags[] {
    return [this.jsonYaml, this.name, this.table]
  }
}

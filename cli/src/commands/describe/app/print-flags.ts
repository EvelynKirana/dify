import type { PrintFlags } from '../../../printers/printer.js'
import { JsonYamlPrintFlags } from '../../../printers/format-json-yaml.js'
import { TextPrintFlags } from '../../../printers/format-text.js'
import { CompositePrintFlags } from '../../../printers/printer.js'
import { APP_DESCRIBE_MODE_KEY, appDescribeTextHandler } from './handlers.js'

export class AppDescribePrintFlags extends CompositePrintFlags {
  private readonly jsonYaml = new JsonYamlPrintFlags()
  private readonly text = new TextPrintFlags()

  constructor() {
    super()
    this.text.register(appDescribeTextHandler, APP_DESCRIBE_MODE_KEY)
  }

  protected families(): readonly PrintFlags[] {
    return [this.jsonYaml, this.text]
  }
}

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InputTypeSelectField from '../index'

const mockField = {
  name: 'input-type',
  state: {
    value: 'text-input',
  },
  handleChange: vi.fn(),
}

vi.mock('../../../..', () => ({
  useFieldContext: () => mockField,
}))

describe('InputTypeSelectField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockField.state.value = 'text-input'
  })

  it('should render label and selected option', () => {
    render(<InputTypeSelectField label="Input type" supportFile={true} />)

    expect(screen.getByText('Input type')).toBeInTheDocument()
    expect(screen.getByText('appDebug.variableConfig.text-input')).toBeInTheDocument()
  })

  it('should update value when users choose another input type', async () => {
    const user = userEvent.setup()
    render(<InputTypeSelectField label="Input type" supportFile={true} />)

    await user.click(screen.getByRole('combobox', { name: 'Input type' }))
    await user.click(screen.getByRole('option', { name: /appDebug.variableConfig.number/ }))

    expect(mockField.handleChange).toHaveBeenCalledWith('number')
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SelectField from '../select'

const mockField = {
  name: 'select-field',
  state: {
    value: 'alpha',
  },
  handleChange: vi.fn(),
}

vi.mock('../../..', () => ({
  useFieldContext: () => mockField,
}))

describe('SelectField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockField.state.value = 'alpha'
  })

  it('should render selected value', () => {
    render(
      <SelectField
        label="Mode"
        options={[
          { label: 'Alpha', value: 'alpha' },
          { label: 'Beta', value: 'beta' },
        ]}
      />,
    )
    expect(screen.getByRole('combobox', { name: 'Mode' })).toHaveTextContent('Alpha')
  })

  it('should update value when users select another option', async () => {
    const user = userEvent.setup()
    render(
      <SelectField
        label="Mode"
        options={[
          { label: 'Alpha', value: 'alpha' },
          { label: 'Beta', value: 'beta' },
        ]}
      />,
    )
    await user.click(screen.getByRole('combobox', { name: 'Mode' }))
    await user.click(screen.getByRole('option', { name: 'Beta' }))
    expect(mockField.handleChange).toHaveBeenCalledWith('beta')
  })
})

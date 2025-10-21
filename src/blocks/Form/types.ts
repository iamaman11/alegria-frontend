// Local types for Form fields (replacing @payloadcms/plugin-form-builder/types)
// These types match the structure from Payload CMS form builder plugin

export interface CheckboxField {
  blockType: 'checkbox'
  name: string
  label?: string
  width?: number
  required?: boolean
  defaultValue?: boolean
}

export interface CountryField {
  blockType: 'country'
  name: string
  label?: string
  width?: number
  required?: boolean
  defaultValue?: any
}

export interface EmailField {
  blockType: 'email'
  name: string
  label?: string
  width?: number
  required?: boolean
  defaultValue?: any
}

export interface NumberField {
  blockType: 'number'
  name: string
  label?: string
  width?: number
  required?: boolean
  defaultValue?: any
}

export interface SelectField {
  blockType: 'select'
  name: string
  label?: string
  width?: number
  required?: boolean
  defaultValue?: any
  options?: Array<{
    label: string
    value: string
  }>
}

export interface StateField {
  blockType: 'state'
  name: string
  label?: string
  width?: number
  required?: boolean
  defaultValue?: any
}

export interface TextField {
  blockType: 'text'
  name: string
  label?: string
  width?: number
  required?: boolean
  defaultValue?: any
}

export interface TextareaField {
  blockType: 'textarea'
  name: string
  label?: string
  width?: number
  required?: boolean
  defaultValue?: any
  rows?: number
}

// Union type for all form fields
export type FormFieldBlock =
  | CheckboxField
  | CountryField
  | EmailField
  | NumberField
  | SelectField
  | StateField
  | TextField
  | TextareaField

// Main Form block type
export interface Form {
  id?: string | number
  blockType: 'form'
  fields: FormFieldBlock[]
  submitButtonLabel?: string
  confirmationType?: 'message' | 'redirect'
  confirmationMessage?: string
  redirect?: {
    url: string
  }
}

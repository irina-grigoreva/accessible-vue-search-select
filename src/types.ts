export type SelectPrimitive = string | number;

export interface SelectOption {
  id?: SelectPrimitive;
  value?: SelectPrimitive;
  slug?: string;
  label?: string;
  name?: string;
  disabled?: boolean;
  address?: {
    city?: string;
    full_address?: string;
  };
  public_title?: string;
  [key: string]: unknown;
}

export type ModelValue = SelectOption | SelectPrimitive | null;

export interface SelectSimpleSearchProps {
  options?: SelectOption[];
  modelValue?: ModelValue;
  placeholder?: string;
  type?: string;
  inlineListbox?: boolean;
  closeOnBlur?: boolean;
  label?: string;
  name?: string;
  inputId?: string;
  listboxId?: string;
  ariaLabel?: string;
  labelKey?: string;
  valueKey?: string;
  searchKeys?: string[];
  disabled?: boolean;
  clearable?: boolean;
  clearLabel?: string;
  noResultsText?: string;
  loading?: boolean;
  loadingText?: string;
  maxHeight?: string;
  dropdownClass?: string;
  optionClass?: string;
  hasError?: boolean;
  facilityFallbackLabel?: string;
  emitValue?: boolean;
  sortOptions?: boolean;
}

export interface SelectSimpleSearchEmits {
  (event: "update:modelValue", value: ModelValue): void;
  (event: "change", value: ModelValue): void;
  (event: "blur"): void;
  (event: "clear"): void;
  (event: "open"): void;
  (event: "close"): void;
}

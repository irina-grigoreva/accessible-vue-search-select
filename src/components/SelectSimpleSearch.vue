<template>
  <div
    ref="rootRef"
    class="select-simple select-simple-search"
    :class="{
      selected: hasSelected,
      disabled,
      'has-error': hasError,
      open: isOpen,
      'has-selected-slot': Boolean($slots.selected) && selectedOption && !search,
    }"
  >
    <label
      v-if="label"
      :for="resolvedInputId"
      class="select-simple-label"
    >
      {{ label }}
    </label>

    <div
      ref="controlRef"
      class="select-simple-control"
    >
      <slot
        v-if="selectedOption && !search"
        name="selected"
        :option="selectedOption"
      />

      <input
        :id="resolvedInputId"
        ref="inputRef"
        v-model="inputValue"
        type="text"
        class="select-simple-input"
        role="combobox"
        :name="name"
        :disabled="disabled"
        :placeholder="placeholder"
        :aria-label="label ? undefined : ariaLabel"
        :aria-expanded="isOpen"
        :aria-controls="listboxId"
        :aria-activedescendant="activeOptionId"
        :aria-invalid="hasError || undefined"
        aria-haspopup="listbox"
        aria-autocomplete="list"
        :aria-busy="loading || undefined"
        autocomplete="off"
        @focus="openDropdown"
        @click="openDropdown"
        @input="handleInput"
        @keydown="handleKeydown"
        @blur="handleBlur"
      >

      <button
        v-if="clearable && hasSelected && !disabled"
        type="button"
        class="select-simple-clear"
        :aria-label="clearLabel"
        @click.stop="clearSelection"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M12 4L4 12M4 4l8 8"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-width="2"
          />
        </svg>
      </button>
    </div>

    <div
      class="sr-only"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ liveMessage }}
    </div>

    <Teleport
      to="body"
      :disabled="inlineListbox"
    >
      <div
        v-if="isOpen && !inlineListbox"
        class="select-simple-overlay"
      />

      <div
        v-if="isOpen"
        :id="listboxId"
        ref="listboxRef"
        role="listbox"
        class="select-simple-options"
        :class="[type, dropdownClass, { 'select-simple-options-inline': inlineListbox }]"
        :style="dropdownStyles"
      >
        <div
          v-if="loading"
          class="select-simple-status"
        >
          <slot name="loading">
            {{ loadingText }}
          </slot>
        </div>

        <template v-else-if="filteredOptions.length">
          <div
            v-for="(option, index) in filteredOptions"
            :id="getOptionId(index)"
            :key="getOptionKey(option, index)"
            role="option"
            class="select-simple-option"
            :class="[
              optionClass,
              {
                selected: isSelected(option),
                active: activeIndex === index,
                disabled: option.disabled,
                highlighted: type === 'billing-state' && activeIndex === index,
              },
            ]"
            :aria-selected="isSelected(option)"
            :aria-disabled="option.disabled || undefined"
            @mousedown.prevent
            @click="selectOption(option)"
          >
            <slot
              name="option"
              :option="option"
              :selected="isSelected(option)"
              :active="activeIndex === index"
            >
              <span class="select-simple-option-text">
                <strong>{{ getOptionLabel(option) }}</strong>
                <span
                  v-if="getOptionDescription(option)"
                  class="select-simple-option-description"
                >
                  {{ getOptionDescription(option) }}
                </span>
              </span>
            </slot>
          </div>
        </template>

        <div
          v-else
          class="select-simple-status"
        >
          <slot name="no-results">
            {{ noResultsText }}
          </slot>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, toRefs, useId, watch } from "vue";
import type {
  SelectOption,
  SelectPrimitive,
  SelectSimpleSearchEmits,
  SelectSimpleSearchProps,
} from "../types";

const props = withDefaults(defineProps<SelectSimpleSearchProps>(), {
  options: () => [],
  modelValue: null,
  placeholder: "Select an option",
  type: "default",
  inlineListbox: false,
  closeOnBlur: false,
  label: "",
  name: "select-simple-search",
  inputId: "",
  listboxId: "",
  ariaLabel: "Search options",
  labelKey: "",
  valueKey: "",
  searchKeys: () => [
    "label",
    "name",
    "public_title",
    "address.city",
    "address.full_address",
    "slug",
    "value",
    "id",
  ],
  disabled: false,
  clearable: true,
  clearLabel: "Clear selection",
  noResultsText: "No results found",
  loading: false,
  loadingText: "Loading options...",
  maxHeight: "18rem",
  dropdownClass: "",
  optionClass: "",
  hasError: false,
  facilityFallbackLabel: "Storage Facility",
  emitValue: false,
  sortOptions: false,
});

const emit = defineEmits<SelectSimpleSearchEmits>();

const uid = useId().replace(/[^A-Za-z0-9_-]/g, "-");
const listboxId = computed(() => props.listboxId || `select-simple-listbox-${uid}`);
const resolvedInputId = computed(() => props.inputId || `select-simple-input-${uid}`);

const rootRef = ref<HTMLElement | null>(null);
const controlRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const listboxRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const search = ref("");
const activeIndex = ref(-1);
const liveMessage = ref("");
const dropdownPosition = ref<Record<string, string>>({});
const ignoreNextDocumentClick = ref(false);

const {
  ariaLabel,
  clearLabel,
  clearable,
  disabled,
  dropdownClass,
  hasError,
  inlineListbox,
  label,
  loading,
  loadingText,
  name,
  noResultsText,
  optionClass,
  placeholder,
  type,
} = toRefs(props);

const dropdownStyles = computed(() => {
  const base = { maxHeight: props.maxHeight };
  return props.inlineListbox ? base : { ...base, ...dropdownPosition.value };
});

const selectedOption = computed<SelectOption | null>(() => {
  const current = props.modelValue;
  if (current === null || current === undefined) {
    return null;
  }

  if (isOption(current)) {
    const currentValue = getOptionValue(current);
    return props.options.find((option) => valuesMatch(getOptionValue(option), currentValue)) ?? current;
  }

  return props.options.find((option) => valuesMatch(getOptionValue(option), current)) ?? null;
});

const selectedLabel = computed(() => {
  return selectedOption.value ? getOptionLabel(selectedOption.value) : "";
});

const hasSelected = computed(() => props.modelValue !== null && props.modelValue !== undefined);

const inputValue = computed({
  get() {
    return search.value || selectedLabel.value;
  },
  set(value: string) {
    search.value = value;
  },
});

const filteredOptions = computed(() => {
  const term = search.value.trim().toLowerCase();
  const options = term
    ? props.options.filter((option) =>
        props.searchKeys.some((key) => stringify(getByPath(option, key)).toLowerCase().includes(term)),
      )
    : props.options;

  if (!props.sortOptions) {
    return [...options];
  }

  return [...options].sort((a, b) => {
    const aLabel = getOptionLabel(a).toLowerCase();
    const bLabel = getOptionLabel(b).toLowerCase();
    return aLabel.localeCompare(bLabel);
  });
});

const activeOptionId = computed(() => {
  if (props.loading || !isOpen.value || activeIndex.value < 0 || activeIndex.value >= filteredOptions.value.length) {
    return undefined;
  }
  return getOptionId(activeIndex.value);
});

function isOption(value: unknown): value is SelectOption {
  return typeof value === "object" && value !== null;
}

function getByPath(option: SelectOption, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, option);
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function getOptionValue(option: SelectOption): SelectPrimitive | undefined {
  if (props.valueKey) {
    const customValue = getByPath(option, props.valueKey);
    if (typeof customValue === "string" || typeof customValue === "number") {
      return customValue;
    }
  }

  return option.slug ?? option.value ?? option.id;
}

function getOptionLabel(option: SelectOption): string {
  if (props.labelKey) {
    const customLabel = stringify(getByPath(option, props.labelKey)).trim();
    if (customLabel) {
      return customLabel;
    }
  }

  if (option.label) {
    return option.label;
  }

  if (option.name) {
    return option.name;
  }

  if (option.address?.city || option.public_title) {
    const city = option.address?.city?.trim();
    const title =
      option.public_title && option.public_title.length > 1 ? option.public_title : props.facilityFallbackLabel;
    return [city, title].filter(Boolean).join(" - ");
  }

  return stringify(getOptionValue(option));
}

function getOptionDescription(option: SelectOption): string {
  return option.address?.full_address ?? "";
}

function getOptionKey(option: SelectOption, index: number): string {
  const value = getOptionValue(option);
  if (value !== undefined) {
    return String(value);
  }
  return `${getOptionLabel(option)}-${index}`;
}

function getOptionId(index: number): string {
  return `${listboxId.value}-option-${index}`;
}

function valuesMatch(a: SelectPrimitive | undefined, b: SelectPrimitive | undefined): boolean {
  if (a === undefined || b === undefined) {
    return false;
  }
  return String(a) === String(b);
}

function isSelected(option: SelectOption): boolean {
  const current = props.modelValue;
  if (current === null || current === undefined) {
    return false;
  }

  if (isOption(current)) {
    const currentValue = getOptionValue(current);
    const optionValue = getOptionValue(option);
    return valuesMatch(currentValue, optionValue) || current === option;
  }

  return valuesMatch(getOptionValue(option), current);
}

function announce(message: string): void {
  liveMessage.value = "";
  nextTick(() => {
    liveMessage.value = message;
  });
}

function getOptionCountLabel(count: number): string {
  return `${count} ${count === 1 ? "option" : "options"} available.`;
}

function updateDropdownPosition(): void {
  if (props.inlineListbox || !controlRef.value) {
    return;
  }

  const rect = controlRef.value.getBoundingClientRect();
  dropdownPosition.value = {
    left: `${rect.left}px`,
    top: `${rect.bottom + 4}px`,
    width: `${rect.width}px`,
  };
}

async function openDropdown(): Promise<void> {
  if (props.disabled || isOpen.value) {
    return;
  }

  ignoreNextDocumentClick.value = true;
  updateDropdownPosition();
  isOpen.value = true;
  emit("open");
  await nextTick();
  updateDropdownPosition();
  setActiveIndex(props.loading ? -1 : firstEnabledIndex());
  announce(props.loading ? props.loadingText : getOptionCountLabel(filteredOptions.value.length));
  window.setTimeout(() => {
    ignoreNextDocumentClick.value = false;
  }, 0);
}

function closeDropdown(): void {
  if (!isOpen.value) {
    return;
  }

  isOpen.value = false;
  activeIndex.value = -1;
  search.value = "";
  emit("close");
}

function firstEnabledIndex(): number {
  return filteredOptions.value.findIndex((option) => !option.disabled);
}

function nextEnabledIndex(start: number, direction: 1 | -1): number {
  const options = filteredOptions.value;
  if (!options.length) {
    return -1;
  }

  let index = start;
  for (let step = 0; step < options.length; step += 1) {
    index = (index + direction + options.length) % options.length;
    if (!options[index].disabled) {
      return index;
    }
  }
  return -1;
}

function setActiveIndex(index: number): void {
  activeIndex.value = index;
  if (index < 0) {
    return;
  }

  const option = filteredOptions.value[index];
  if (!option) {
    activeIndex.value = -1;
    return;
  }

  announce(`${getOptionLabel(option)}, ${index + 1} of ${filteredOptions.value.length}.`);
  scrollActiveOptionIntoView();
}

function scrollActiveOptionIntoView(): void {
  nextTick(() => {
    const activeId = activeOptionId.value;
    if (!activeId || !listboxRef.value) {
      return;
    }

    const activeElement = listboxRef.value.querySelector<HTMLElement>(`#${activeId}`);
    activeElement?.scrollIntoView?.({ block: "nearest" });
  });
}

async function handleInput(): Promise<void> {
  if (props.disabled) {
    return;
  }

  if (hasSelected.value && search.value.trim()) {
    emit("update:modelValue", null);
    emit("change", null);
  }

  if (!isOpen.value) {
    await openDropdown();
    return;
  }

  await nextTick();
  updateDropdownPosition();
  setActiveIndex(firstEnabledIndex());
  announce(getOptionCountLabel(filteredOptions.value.length));
}

function handleKeydown(event: KeyboardEvent): void {
  if (props.disabled) {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeDropdown();
    inputRef.value?.focus();
    return;
  }

  if ((event.key === "Backspace" || event.key === "Delete") && hasSelected.value && !search.value) {
    event.preventDefault();
    clearSelection();
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (!isOpen.value) {
      void openDropdown();
      return;
    }
    if (props.loading) {
      return;
    }
    setActiveIndex(nextEnabledIndex(activeIndex.value, 1));
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (!isOpen.value) {
      void openDropdown();
      return;
    }
    if (props.loading) {
      return;
    }
    setActiveIndex(nextEnabledIndex(activeIndex.value < 0 ? filteredOptions.value.length : activeIndex.value, -1));
    return;
  }

  if (event.key === "Enter") {
    if (!isOpen.value || props.loading) {
      return;
    }
    event.preventDefault();
    const activeOption = filteredOptions.value[activeIndex.value];
    if (activeOption && !activeOption.disabled) {
      selectOption(activeOption);
    }
  }
}

function selectOption(option: SelectOption): void {
  if (props.disabled || option.disabled) {
    return;
  }

  const value = props.emitValue ? getOptionValue(option) ?? option : option;
  emit("update:modelValue", value);
  emit("change", value);
  announce(`${getOptionLabel(option)} selected.`);
  closeDropdown();
  inputRef.value?.focus();
}

function clearSelection(): void {
  if (props.disabled) {
    return;
  }

  emit("update:modelValue", null);
  emit("change", null);
  emit("clear");
  search.value = "";
  announce("Selection cleared.");
  void openDropdown();
  inputRef.value?.focus();
}

function handleBlur(): void {
  window.setTimeout(() => {
    if (props.closeOnBlur) {
      closeDropdown();
    }
    emit("blur");
  }, 100);
}

function handleDocumentClick(event: MouseEvent): void {
  const target = event.target as Node | null;
  if (!target || !isOpen.value) {
    return;
  }

  if (ignoreNextDocumentClick.value) {
    ignoreNextDocumentClick.value = false;
    return;
  }

  const clickedControl = rootRef.value?.contains(target);
  const clickedListbox = listboxRef.value?.contains(target);

  if (!clickedControl && !clickedListbox) {
    closeDropdown();
  }
}

function handleWindowChange(): void {
  if (isOpen.value) {
    updateDropdownPosition();
  }
}

watch(
  () => props.loading,
  (isLoading) => {
    if (isOpen.value) {
      activeIndex.value = isLoading ? -1 : firstEnabledIndex();
      announce(isLoading ? props.loadingText : getOptionCountLabel(filteredOptions.value.length));
    }
  },
);

watch(filteredOptions, (options) => {
  if (!isOpen.value || props.loading) {
    return;
  }

  if (!options.length) {
    activeIndex.value = -1;
    announce(props.noResultsText);
    return;
  }

  if (activeIndex.value < 0 || activeIndex.value >= options.length || options[activeIndex.value]?.disabled) {
    setActiveIndex(firstEnabledIndex());
  }
});

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
  window.addEventListener("resize", handleWindowChange);
  window.addEventListener("scroll", handleWindowChange, true);
});

onUnmounted(() => {
  document.removeEventListener("click", handleDocumentClick);
  window.removeEventListener("resize", handleWindowChange);
  window.removeEventListener("scroll", handleWindowChange, true);
});
</script>

<style scoped>
.select-simple,
.select-simple-options {
  --select-simple-bg: #fff;
  --select-simple-text: #111827;
  --select-simple-muted: #4b5563;
  --select-simple-border: #9ca3af;
  --select-simple-border-subtle: #d1d5db;
  --select-simple-focus-border: #2563eb;
  --select-simple-focus-ring: #bfdbfe;
  --select-simple-clear-hover-bg: #f3f4f6;
  --select-simple-option-active-bg: #eff6ff;
  --select-simple-option-selected-bg: #dbeafe;
  --select-simple-option-hover-bg: #f8fafc;
  --select-simple-error: #dc2626;
  --select-simple-shadow: 0 10px 24px rgb(15 23 42 / 14%);

  position: relative;
  width: 100%;
  color: var(--select-simple-text);
}

@media (prefers-color-scheme: dark) {
  .select-simple,
  .select-simple-options {
    --select-simple-bg: #111827;
    --select-simple-text: #f9fafb;
    --select-simple-muted: #cbd5e1;
    --select-simple-border: #475569;
    --select-simple-border-subtle: #334155;
    --select-simple-focus-border: #60a5fa;
    --select-simple-focus-ring: #1e3a8a;
    --select-simple-clear-hover-bg: #1f2937;
    --select-simple-option-active-bg: #1d4ed8;
    --select-simple-option-selected-bg: #1e40af;
    --select-simple-option-hover-bg: #1f2937;
    --select-simple-error: #f87171;
    --select-simple-shadow: 0 14px 32px rgb(0 0 0 / 34%);
  }
}

:global([data-theme="light"]) .select-simple,
:global([data-theme="light"]) .select-simple-options {
  --select-simple-bg: #fff;
  --select-simple-text: #111827;
  --select-simple-muted: #4b5563;
  --select-simple-border: #9ca3af;
  --select-simple-border-subtle: #d1d5db;
  --select-simple-focus-border: #2563eb;
  --select-simple-focus-ring: #bfdbfe;
  --select-simple-clear-hover-bg: #f3f4f6;
  --select-simple-option-active-bg: #eff6ff;
  --select-simple-option-selected-bg: #dbeafe;
  --select-simple-option-hover-bg: #f8fafc;
  --select-simple-error: #dc2626;
  --select-simple-shadow: 0 10px 24px rgb(15 23 42 / 14%);
}

:global([data-theme="dark"]) .select-simple,
:global([data-theme="dark"]) .select-simple-options {
  --select-simple-bg: #111827;
  --select-simple-text: #f9fafb;
  --select-simple-muted: #cbd5e1;
  --select-simple-border: #475569;
  --select-simple-border-subtle: #334155;
  --select-simple-focus-border: #60a5fa;
  --select-simple-focus-ring: #1e3a8a;
  --select-simple-clear-hover-bg: #1f2937;
  --select-simple-option-active-bg: #1d4ed8;
  --select-simple-option-selected-bg: #1e40af;
  --select-simple-option-hover-bg: #1f2937;
  --select-simple-error: #f87171;
  --select-simple-shadow: 0 14px 32px rgb(0 0 0 / 34%);
}

.select-simple-label {
  display: block;
  margin-bottom: 0.375rem;
  font-weight: 600;
}

.select-simple-control {
  position: relative;
}

.select-simple.has-selected-slot .select-simple-control > :not(input, button) {
  position: absolute;
  top: 50%;
  left: 0.75rem;
  z-index: 1;
  max-width: calc(100% - 3rem);
  overflow: hidden;
  pointer-events: none;
  text-overflow: ellipsis;
  white-space: nowrap;
  transform: translateY(-50%);
}

.select-simple.has-selected-slot:focus-within .select-simple-control > :not(input, button) {
  display: none;
}

.select-simple-input {
  box-sizing: border-box;
  width: 100%;
  min-height: 2.5rem;
  padding: 0.5rem 2.25rem 0.5rem 0.75rem;
  border: 1px solid var(--select-simple-border);
  border-radius: 6px;
  background-color: var(--select-simple-bg);
  color: var(--select-simple-text);
  font: inherit;
}

.select-simple.has-selected-slot .select-simple-input {
  color: transparent;
}

.select-simple.has-selected-slot .select-simple-input:focus {
  color: var(--select-simple-text);
}

.select-simple-input:focus {
  border-color: var(--select-simple-focus-border);
  outline: 2px solid var(--select-simple-focus-ring);
  outline-offset: 1px;
}

.select-simple.disabled {
  opacity: 0.65;
}

.select-simple.has-error .select-simple-input {
  border-color: var(--select-simple-error);
}

.select-simple-clear {
  position: absolute;
  top: 50%;
  right: 0.5rem;
  display: inline-flex;
  width: 1.75rem;
  height: 1.75rem;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--select-simple-muted);
  cursor: pointer;
  transform: translateY(-50%);
}

.select-simple-clear:hover {
  background: var(--select-simple-clear-hover-bg);
  color: var(--select-simple-text);
}

.select-simple-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  pointer-events: none;
}

.select-simple-options {
  position: fixed;
  z-index: 1000;
  box-sizing: border-box;
  overflow-y: auto;
  border: 1px solid var(--select-simple-border-subtle);
  border-radius: 6px;
  background-color: var(--select-simple-bg);
  box-shadow: var(--select-simple-shadow);
  color: var(--select-simple-text);
}


*::-webkit-scrollbar {
  width: 6px;
}

*::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, .2);
  border-radius: 999px;
}

.select-simple-options-inline {
  position: relative;
  z-index: 1;
  width: 100%;
  margin-top: 0.25rem;
  box-shadow: none;
}

.select-simple-option,
.select-simple-status {
  padding: 0.625rem 0.75rem;
}

.select-simple-option {
  background-color: var(--select-simple-bg);
  cursor: pointer;
}

.select-simple-option:hover {
  background-color: var(--select-simple-option-hover-bg);
}

.select-simple-option.active {
  background-color: var(--select-simple-option-active-bg);
}

.select-simple-option.selected {
  background-color: var(--select-simple-option-selected-bg);
}

.select-simple-option.disabled {
  color: var(--select-simple-muted);
  cursor: not-allowed;
}

.select-simple-option-text {
  display: grid;
  gap: 0.125rem;
}

.select-simple-option-description {
  color: var(--select-simple-muted);
  font-size: 0.875rem;
}

.select-simple-status {
  color: var(--select-simple-muted);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>

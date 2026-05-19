<template>
  <main class="demo-page" :data-theme="theme">
    <section class="demo-header">
      <div>
        <h1>Accessible Vue Search Select</h1>
        <p>
          A compact Vue 3 combobox/listbox component with keyboard navigation,
          slots, loading and disabled states, and facility-data compatibility.
        </p>
      </div>

      <button
        type="button"
        class="theme-toggle"
        :aria-pressed="theme === 'dark'"
        @click="toggleTheme"
      >
        {{ theme === "dark" ? "Light mode" : "Dark mode" }}
      </button>
    </section>

    <section class="demo-grid">
      <article>
        <h2>Basic select</h2>
        <SelectSimpleSearch
          v-model="selectedState"
          label="State"
          placeholder="Choose a state"
          :options="states"
        />
      </article>

      <article>
        <h2>Facility search</h2>
        <SelectSimpleSearch
          v-model="selectedFacility"
          label="Facility"
          placeholder="Search facilities"
          :options="facilities"
        />
      </article>

      <article>
        <h2>Billing state</h2>
        <SelectSimpleSearch
          v-model="billingState"
          type="billing-state"
          label="Billing state"
          label-key="name"
          value-key="value"
          placeholder="Select billing state"
          :options="states"
        />
      </article>

      <article>
        <h2>Async/loading</h2>
        <SelectSimpleSearch
          v-model="asyncValue"
          label="Async options"
          placeholder="Options are loading"
          loading
          :options="[]"
        />
      </article>

      <article>
        <h2>Custom option slot</h2>
        <SelectSimpleSearch
          v-model="selectedFacilityWithSlot"
          label="Custom facility"
          :options="facilities"
        >
          <template #option="{ option, active, selected }">
            <div class="custom-option" :class="{ active, selected }">
              <strong>{{ option.address?.city }}</strong>
              <span>{{ option.public_title }}</span>
              <small>{{ option.address?.full_address }}</small>
            </div>
          </template>
        </SelectSimpleSearch>
      </article>

      <article>
        <h2>Inline listbox</h2>
        <SelectSimpleSearch
          v-model="inlineValue"
          label="Inline"
          placeholder="Open inline list"
          inline-listbox
          :options="states"
        />
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import SelectSimpleSearch from "../src/components/SelectSimpleSearch.vue";

const states = [
  { label: "California", value: "ca", name: "California" },
  { label: "New York", value: "ny", name: "New York" },
  { label: "Texas", value: "tx", name: "Texas" },
  { label: "Washington", value: "wa", name: "Washington", disabled: true },
];

const facilities = [
  {
    id: 1,
    slug: "brooklyn-storage",
    public_title: "Downtown Storage",
    address: {
      city: "Brooklyn",
      full_address: "120 Water Street, Brooklyn, NY",
    },
  },
  {
    id: 2,
    slug: "austin-storage",
    public_title: "Climate Controlled Units",
    address: {
      city: "Austin",
      full_address: "44 South Congress Avenue, Austin, TX",
    },
  },
  {
    id: 3,
    slug: "seattle-storage",
    public_title: "",
    address: {
      city: "Seattle",
      full_address: "8 Pine Street, Seattle, WA",
    },
  },
];

const theme = ref<"light" | "dark">("light");
const selectedState = ref<(typeof states)[number] | null>(null);
const selectedFacility = ref<(typeof facilities)[number] | null>(null);
const billingState = ref<(typeof states)[number] | null>(null);
const asyncValue = ref<(typeof states)[number] | null>(null);
const selectedFacilityWithSlot = ref<(typeof facilities)[number] | null>(null);
const inlineValue = ref<(typeof states)[number] | null>(null);

function toggleTheme() {
  theme.value = theme.value === "dark" ? "light" : "dark";
}

function syncDocumentTheme(value: "light" | "dark") {
  document.documentElement.dataset.theme = value;
}

onMounted(() => {
  syncDocumentTheme(theme.value);
});

onUnmounted(() => {
  delete document.documentElement.dataset.theme;
});

watch(theme, syncDocumentTheme);
</script>

<style scoped>
.demo-page {
  min-height: 100vh;
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem;
  color: #111827;
  font-family: system-ui, sans-serif;
}

.demo-page[data-theme="dark"] {
  color: #f8fafc;
}

.demo-header {
  display: flex;
  gap: 1rem;
  align-items: start;
  justify-content: space-between;
}

.theme-toggle {
  flex: 0 0 auto;
  min-height: 2.25rem;
  padding: 0.45rem 0.75rem;
  border: 1px solid #94a3b8;
  border-radius: 6px;
  background: #fff;
  color: #0f172a;
  cursor: pointer;
}

.demo-page[data-theme="dark"] .theme-toggle {
  border-color: #475569;
  background: #111827;
  color: #f8fafc;
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

article {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.demo-page[data-theme="dark"] article {
  border-color: #334155;
  background: #0f172a;
}

h2 {
  margin-top: 0;
  font-size: 1rem;
}

.custom-option {
  display: grid;
  gap: 0.125rem;
}

.custom-option small {
  color: #4b5563;
}

.demo-page[data-theme="dark"] .custom-option small {
  color: #cbd5e1;
}

</style>

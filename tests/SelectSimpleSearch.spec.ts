import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick, ref } from "vue";
import SelectSimpleSearch from "../src/components/SelectSimpleSearch.vue";

const options = [
  { label: "California", value: "ca" },
  { label: "New York", value: "ny" },
  { label: "Texas", value: "tx" },
];

function mountSelect(props = {}) {
  return mount(SelectSimpleSearch, {
    props: {
      inlineListbox: true,
      options,
      ...props,
    },
  });
}

describe("SelectSimpleSearch", () => {
  it("renders options when opened", async () => {
    const wrapper = mountSelect();

    await wrapper.find("input").trigger("focus");

    expect(wrapper.find('[role="listbox"]').exists()).toBe(true);
    expect(wrapper.findAll('[role="option"]')).toHaveLength(3);
  });

  it("wires expanded state, listbox id, option ids, and selected state", async () => {
    const wrapper = mountSelect({
      inputId: "select-simple-input-v-1",
      listboxId: "select-simple-listbox-v-1",
      modelValue: options[1],
    });
    const input = wrapper.find("input");

    await input.trigger("focus");

    const listbox = wrapper.find("#select-simple-listbox-v-1");
    const renderedOptions = wrapper.findAll('[role="option"]');

    expect(input.attributes("aria-expanded")).toBe("true");
    expect(input.attributes("aria-controls")).toBe("select-simple-listbox-v-1");
    expect(listbox.exists()).toBe(true);
    expect(listbox.attributes("role")).toBe("listbox");
    expect(renderedOptions).toHaveLength(3);
    expect(renderedOptions[0]!.attributes("id")).toBe("select-simple-listbox-v-1-option-0");
    expect(renderedOptions[0]!.attributes("aria-selected")).toBe("false");
    expect(renderedOptions[1]!.attributes("id")).toBe("select-simple-listbox-v-1-option-1");
    expect(renderedOptions[1]!.attributes("aria-selected")).toBe("true");
  });

  it("updates aria-activedescendant when navigating with ArrowDown and ArrowUp", async () => {
    const wrapper = mountSelect({ listboxId: "select-simple-listbox-v-1" });
    const input = wrapper.find("input");

    await input.trigger("focus");
    await input.trigger("keydown", { key: "ArrowDown" });

    expect(input.attributes("aria-activedescendant")).toBe("select-simple-listbox-v-1-option-1");

    await input.trigger("keydown", { key: "ArrowUp" });

    expect(input.attributes("aria-activedescendant")).toBe("select-simple-listbox-v-1-option-0");
  });

  it("filters by search text", async () => {
    const wrapper = mountSelect();
    const input = wrapper.find("input");

    await input.trigger("focus");
    await input.setValue("new");

    expect(wrapper.findAll('[role="option"]')).toHaveLength(1);
    expect(wrapper.text()).toContain("New York");
  });

  it("preserves source option order by default", async () => {
    const wrapper = mountSelect({
      options: [
        { label: "Texas", value: "tx" },
        { label: "California", value: "ca" },
        { label: "New York", value: "ny" },
      ],
    });

    await wrapper.find("input").trigger("focus");

    const labels = wrapper.findAll('[role="option"]').map((option) => option.text());
    expect(labels).toEqual(["Texas", "California", "New York"]);
  });

  it("sorts options alphabetically when sortOptions is enabled", async () => {
    const wrapper = mountSelect({
      sortOptions: true,
      options: [
        { label: "Texas", value: "tx" },
        { label: "California", value: "ca" },
        { label: "New York", value: "ny" },
      ],
    });

    await wrapper.find("input").trigger("focus");

    const labels = wrapper.findAll('[role="option"]').map((option) => option.text());
    expect(labels).toEqual(["California", "New York", "Texas"]);
  });

  it("emits update:modelValue when an option is selected", async () => {
    const wrapper = mountSelect();

    await wrapper.find("input").trigger("focus");
    await wrapper.findAll('[role="option"]')[1]!.trigger("click");

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([options[1]]);
  });

  it("can emit primitive values for simple options", async () => {
    const wrapper = mountSelect({ emitValue: true });

    await wrapper.find("input").trigger("focus");
    await wrapper.findAll('[role="option"]')[1]!.trigger("click");

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["ny"]);
  });

  it("clears selection", async () => {
    const wrapper = mountSelect({ modelValue: options[0] });

    await wrapper.find("button").trigger("click");

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([null]);
    expect(wrapper.emitted("clear")).toBeTruthy();
  });

  it("shows the selected facility label after selection", async () => {
    const facilities = [
      {
        id: 1,
        slug: "seattle-storage",
        public_title: "",
        address: {
          city: "Seattle",
          full_address: "8 Pine Street, Seattle, WA",
        },
      },
    ];

    const Host = defineComponent({
      components: { SelectSimpleSearch },
      setup() {
        return {
          facilities,
          selected: ref(null),
        };
      },
      template: `
        <SelectSimpleSearch
          v-model="selected"
          inline-listbox
          :options="facilities"
        />
      `,
    });

    const wrapper = mount(Host);
    const input = wrapper.find("input");

    await input.trigger("focus");
    await wrapper.find('[role="option"]').trigger("click");
    await nextTick();

    expect(wrapper.find("input").element.value).toBe("Seattle - Storage Facility");
  });

  it("hides the clear button when disabled", () => {
    const wrapper = mountSelect({
      disabled: true,
      modelValue: options[0],
    });

    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("keeps the input before the clear button in tab order", () => {
    const wrapper = mountSelect({ modelValue: options[0] });
    const input = wrapper.find("input").element;
    const button = wrapper.find("button").element;

    expect(input.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("selects the active option with ArrowDown and Enter", async () => {
    const wrapper = mountSelect();
    const input = wrapper.find("input");

    await input.trigger("focus");
    await input.trigger("keydown", { key: "ArrowDown" });
    await input.trigger("keydown", { key: "Enter" });

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([options[1]]);
  });

  it("closes on Escape", async () => {
    const wrapper = mountSelect();
    const input = wrapper.find("input");

    await input.trigger("focus");
    await input.trigger("keydown", { key: "Escape" });

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(input.attributes("aria-expanded")).toBe("false");
  });

  it("does not immediately close from the opening click", async () => {
    const wrapper = mountSelect({ inlineListbox: false });
    const input = wrapper.find("input");

    await input.trigger("focus");
    document.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(input.attributes("aria-expanded")).toBe("true");

    await new Promise((resolve) => {
      window.setTimeout(resolve, 0);
    });
    document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();

    expect(input.attributes("aria-expanded")).toBe("false");
  });

  it("positions the teleported dropdown on first open", async () => {
    const rect = {
      bottom: 68,
      height: 40,
      left: 24,
      right: 344,
      top: 28,
      width: 320,
      x: 24,
      y: 28,
      toJSON: () => ({}),
    } as DOMRect;
    const rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect);
    const wrapper = mountSelect({
      inlineListbox: false,
      listboxId: "positioned-listbox",
    });

    await wrapper.find("input").trigger("focus");
    await nextTick();

    const listbox = document.getElementById("positioned-listbox");
    expect(listbox?.style.position).toBe("");
    expect(listbox?.style.left).toBe("24px");
    expect(listbox?.style.top).toBe("72px");
    expect(listbox?.style.width).toBe("320px");

    wrapper.unmount();
    rectSpy.mockRestore();
  });

  it("does not intercept Home and End text-input keys", async () => {
    const wrapper = mountSelect();
    const input = wrapper.find("input");

    await input.trigger("focus");
    await input.trigger("keydown", { key: "End" });
    await input.trigger("keydown", { key: "Home" });

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("does not open when disabled", async () => {
    const wrapper = mountSelect({ disabled: true });

    await wrapper.find("input").trigger("focus");
    await nextTick();

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
  });

  it("does not expose an active descendant while loading", async () => {
    const wrapper = mountSelect({ loading: true });
    const input = wrapper.find("input");

    await input.trigger("focus");

    expect(wrapper.find('[role="option"]').exists()).toBe(false);
    expect(input.attributes("aria-activedescendant")).toBeUndefined();
  });
});

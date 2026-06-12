export const FISH_SELECTED_EVENT = "minisea:fish-selected";

export type FishSelectedDetail = {
  fileName: string;
};

export function dispatchFishSelected(fileName: string): void {
  window.dispatchEvent(
    new CustomEvent<FishSelectedDetail>(FISH_SELECTED_EVENT, {
      detail: { fileName },
    }),
  );
}

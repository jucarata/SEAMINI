import { Aquarium } from "@/components/Aquarium";

export default function Home() {
  return (
    <main
      className="flex h-dvh w-full items-center justify-center overflow-hidden"
      style={{ padding: "var(--page-inset)" }}
    >
      <div className="w-full">
        <Aquarium />
      </div>
    </main>
  );
}
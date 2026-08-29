import { CoverPreview } from "@/components/eazo-cover/cover-preview";

// Standalone cover-capture route. Auth-free, no product handlers, no storage.
export default function EazoCoverPreviewPage() {
  return (
    <div data-eazo-cover-ready className="h-screen w-screen overflow-hidden">
      <CoverPreview />
    </div>
  );
}

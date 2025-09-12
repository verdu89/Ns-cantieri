import { Button } from "@/components/ui/Button";

interface JobActionBarProps {
  files: File[];
  savingDraft: boolean;
  setSavingDraft: (v: boolean) => void;
  setCheckoutOpen: (v: boolean) => void;
}

export default function JobActionBar({
  files,
  savingDraft,
  setSavingDraft,
  setCheckoutOpen,
}: JobActionBarProps) {
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      // TODO: logica reale salvataggio bozza
      console.log("Salvataggio bozza con file:", files);
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 shadow-lg flex justify-between items-center">
      <Button
        disabled={savingDraft}
        onClick={handleSaveDraft}
        className="bg-gray-200 text-gray-700 hover:bg-gray-300"
      >
        {savingDraft ? "Salvataggio..." : "Salva bozza"}
      </Button>

      <Button onClick={() => setCheckoutOpen(true)}>Checkout</Button>
    </div>
  );
}

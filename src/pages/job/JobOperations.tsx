import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { UploadArea } from "@/components/files/UploadArea";

interface JobOperationsProps {
  note: string;
  setNote: (v: string) => void;
  setFiles: (f: File[]) => void;
}

export default function JobOperations({
  note,
  setNote,
  setFiles,
}: JobOperationsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Operatività montatori</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Area upload file */}
        <div>
          <div className="font-medium mb-2">Allegati</div>
          <UploadArea onChange={setFiles} /> {/* ✅ corretto */}
        </div>

        {/* Note intervento montatore */}
        <div>
          <div className="font-medium mb-2">Note</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm text-sm"
            rows={4}
            placeholder="Aggiungi note operative..."
          />
        </div>
      </CardContent>
    </Card>
  );
}

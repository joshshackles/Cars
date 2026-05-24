import Link from "next/link";
import { Button } from "@/components/ui/button";

const links = [
  ["Pending", "/mileage/pending"],
  ["Approved", "/mileage/approved"],
  ["Rejected", "/mileage/rejected"],
  ["Driver summaries", "/mileage/drivers"],
  ["Batches", "/reimbursements/batches"],
] as const;

export function MileageNav() {
  return (
    <div className="flex flex-wrap gap-2">
      {links.map(([label, href]) => (
        <Button key={href} asChild variant="outline" size="sm">
          <Link href={href}>{label}</Link>
        </Button>
      ))}
    </div>
  );
}

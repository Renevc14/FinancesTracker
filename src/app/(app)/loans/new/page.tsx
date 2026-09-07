import Link from "next/link";
import { PersonalLoanForm } from "@/components/forms/personal-loan-form";

export const dynamic = "force-dynamic";

export default function NewPersonalLoanPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/loans" className="ios-back">
          ‹ Loans
        </Link>
        <h1 className="mt-2 ios-large-title">New loan</h1>
      </div>
      <div className="ios-group p-4">
        <PersonalLoanForm />
      </div>
    </div>
  );
}

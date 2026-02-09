/**
 * BankControls - Bank selection and management
 */

import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PadBank } from "@/types";

interface BankControlsProps {
    banks: PadBank[];
    activeBankId: string;
    onBankChange: (bankId: string) => void;
    onCopyBank: (fromBankId: string, toBankId: string) => void;
}

export function BankControls({
    banks,
    activeBankId,
    onBankChange,
    onCopyBank,
}: BankControlsProps) {
    return (
        <>
            {/* Bank Selection */}
            <div className="space-y-3">
                <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-[0.15em] uppercase">
                    <Copy className="h-3.5 w-3.5" />
                    Bank Selection
                </div>
                <div className="bg-primary/5 border-primary/10 rounded-lg border p-3">
                    <div className="grid grid-cols-4 gap-2">
                        {banks.map((bank) => (
                            <Button
                                key={bank.id}
                                size="sm"
                                variant={activeBankId === bank.id ? "default" : "outline"}
                                onClick={() => onBankChange(bank.id)}
                                className="h-10 text-xs font-bold"
                            >
                                {bank.name}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bank Actions */}
            <div className="space-y-3">
                <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-[0.15em] uppercase">
                    <Copy className="h-3.5 w-3.5" />
                    Bank Actions
                </div>
                <div className="bg-secondary/5 border-secondary/10 space-y-2 rounded-lg border p-3">
                    <label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                        Copy Current Bank To:
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {banks
                            .filter((b) => b.id !== activeBankId)
                            .map((bank) => (
                                <Button
                                    key={bank.id}
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onCopyBank(activeBankId, bank.id)}
                                    className="text-xs"
                                >
                                    {bank.name}
                                </Button>
                            ))}
                    </div>
                </div>
            </div>
        </>
    );
}


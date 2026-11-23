import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface ClientOption {
  id: number;
  name: string;
  whatsappPhone?: string | null;
}

interface ClientComboboxProps {
  clients: ClientOption[];
  value: number | null;
  onChange: (id: number) => void;
  placeholder?: string;
}

/** Selector de cliente con buscador: se escribe el nombre o el teléfono y la lista se filtra. */
export function ClientCombobox({ clients, value, onChange, placeholder = "Seleccionar cliente" }: ClientComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = clients.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex-1 justify-between bg-card border-[rgba(106,207,199,0.18)] hover:border-[oklch(0.72_0.14_180)] font-normal"
        >
          <span className="truncate">{selected ? selected.name : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Escribe el nombre o teléfono..." />
          <CommandList>
            <CommandEmpty>No se encontró ningún cliente. Usa el botón para crearlo.</CommandEmpty>
            <CommandGroup>
              {clients.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.name} ${c.whatsappPhone ?? ""} ${c.id}`}
                  onSelect={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4", value === c.id ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{c.name}</span>
                  {c.whatsappPhone ? <span className="ml-auto text-xs text-muted-foreground">{c.whatsappPhone}</span> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

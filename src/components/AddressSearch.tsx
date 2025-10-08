"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAddress, getAddress } from "viem";
import { Search } from "lucide-react";

export interface AddressSearchProps {
  defaultValue?: string;
  onSubmit?: (checksummedAddress: string) => void;
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced as T;
}

export default function AddressSearch({ defaultValue, onSubmit }: AddressSearchProps) {
  const [input, setInput] = useState<string>(defaultValue ?? "");
  const [touched, setTouched] = useState(false);
  const debounced = useDebounced(input, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  const isValid = useMemo(() => (debounced ? isAddress(debounced) : false), [debounced]);
  const error = useMemo(() => {
    if (!touched) return "";
    if (!input) return "Address is required";
    if (input && !isValid) return "Enter a valid Ethereum address";
    return "";
  }, [input, isValid, touched]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      setTouched(true);
      if (!isValid || !onSubmit) return;
      const checksum = getAddress(debounced);
      onSubmit(checksum);
    },
    [debounced, isValid, onSubmit]
  );

  useEffect(() => {
    // Submit when the user pauses typing and the address becomes valid
    if (isValid && touched && onSubmit) {
      const id = setTimeout(() => handleSubmit(), 100);
      return () => clearTimeout(id);
    }
  }, [isValid, touched, onSubmit, handleSubmit]);

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl" aria-label="Address search form">
      <label htmlFor="address" className="sr-only">
        Ethereum address
      </label>
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            ref={inputRef}
            id="address"
            name="address"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="0x1111… or 0x2222…"
            aria-invalid={!!error}
            aria-describedby="address-error"
            className="w-full pl-10 pr-3 py-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={input}
            onChange={(e) => setInput(e.target.value.trim())}
            onBlur={() => setTouched(true)}
          />
        </div>
        <button
          type="submit"
          aria-label="Analyze"
          className="px-4 py-3 rounded-md bg-blue-600 text-white text-sm md:text-base disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={!isValid}
        >
          Analyze
        </button>
      </div>
      {error ? (
        <p id="address-error" role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-gray-500">
        Examples: 0x1111… (safe), 0x2222… (risky token), 0x3333… (unverified)
      </p>
    </form>
  );
}




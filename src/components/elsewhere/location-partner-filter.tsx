import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Compass,
  Globe,
  MapPin,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LocationScope, Place } from "@/lib/elsewhere/types";

type LocationOption = {
  type: "city" | "region" | "country";
  city: string;
  region: string;
  country: string;
  displayName: string;
  subText: string;
};

const PRESET_LOCATIONS: LocationOption[] = [
  // Major Cities with their Province/State
  { type: "city", city: "Toronto", region: "Ontario", country: "Canada", displayName: "Toronto", subText: "Ontario, Canada" },
  { type: "city", city: "Vancouver", region: "British Columbia", country: "Canada", displayName: "Vancouver", subText: "British Columbia, Canada" },
  { type: "city", city: "Montreal", region: "Quebec", country: "Canada", displayName: "Montreal", subText: "Quebec, Canada" },
  { type: "city", city: "Calgary", region: "Alberta", country: "Canada", displayName: "Calgary", subText: "Alberta, Canada" },
  { type: "city", city: "Ottawa", region: "Ontario", country: "Canada", displayName: "Ottawa", subText: "Ontario, Canada" },
  { type: "city", city: "New York", region: "New York", country: "United States", displayName: "New York", subText: "New York, USA" },
  { type: "city", city: "Los Angeles", region: "California", country: "United States", displayName: "Los Angeles", subText: "California, USA" },
  { type: "city", city: "San Francisco", region: "California", country: "United States", displayName: "San Francisco", subText: "California, USA" },
  { type: "city", city: "Chicago", region: "Illinois", country: "United States", displayName: "Chicago", subText: "Illinois, USA" },
  { type: "city", city: "Seattle", region: "Washington", country: "United States", displayName: "Seattle", subText: "Washington, USA" },
  { type: "city", city: "Austin", region: "Texas", country: "United States", displayName: "Austin", subText: "Texas, USA" },
  { type: "city", city: "Miami", region: "Florida", country: "United States", displayName: "Miami", subText: "Florida, USA" },
  { type: "city", city: "Boston", region: "Massachusetts", country: "United States", displayName: "Boston", subText: "Massachusetts, USA" },
  { type: "city", city: "Denver", region: "Colorado", country: "United States", displayName: "Denver", subText: "Colorado, USA" },
  { type: "city", city: "London", region: "England", country: "United Kingdom", displayName: "London", subText: "England, UK" },
  { type: "city", city: "Sydney", region: "New South Wales", country: "Australia", displayName: "Sydney", subText: "New South Wales, Australia" },
  { type: "city", city: "Melbourne", region: "Victoria", country: "Australia", displayName: "Melbourne", subText: "Victoria, Australia" },
  { type: "city", city: "Tokyo", region: "Tokyo", country: "Japan", displayName: "Tokyo", subText: "Japan" },
  { type: "city", city: "Mumbai", region: "Maharashtra", country: "India", displayName: "Mumbai", subText: "Maharashtra, India" },
  { type: "city", city: "Berlin", region: "Berlin", country: "Germany", displayName: "Berlin", subText: "Germany" },
  { type: "city", city: "Paris", region: "Île-de-France", country: "France", displayName: "Paris", subText: "France" },

  // Key Provinces & States
  { type: "region", city: "", region: "Ontario", country: "Canada", displayName: "Ontario", subText: "Province, Canada" },
  { type: "region", city: "", region: "British Columbia", country: "Canada", displayName: "British Columbia", subText: "Province, Canada" },
  { type: "region", city: "", region: "Quebec", country: "Canada", displayName: "Quebec", subText: "Province, Canada" },
  { type: "region", city: "", region: "Alberta", country: "Canada", displayName: "Alberta", subText: "Province, Canada" },
  { type: "region", city: "", region: "California", country: "United States", displayName: "California", subText: "State, USA" },
  { type: "region", city: "", region: "New York", country: "United States", displayName: "New York State", subText: "State, USA" },
  { type: "region", city: "", region: "Texas", country: "United States", displayName: "Texas", subText: "State, USA" },
  { type: "region", city: "", region: "Florida", country: "United States", displayName: "Florida", subText: "State, USA" },
  { type: "region", city: "", region: "Washington", country: "United States", displayName: "Washington State", subText: "State, USA" },
  { type: "region", city: "", region: "Illinois", country: "United States", displayName: "Illinois", subText: "State, USA" },
  { type: "region", city: "", region: "Massachusetts", country: "United States", displayName: "Massachusetts", subText: "State, USA" },
  { type: "region", city: "", region: "Maharashtra", country: "India", displayName: "Maharashtra", subText: "State, India" },
  { type: "region", city: "", region: "New South Wales", country: "Australia", displayName: "New South Wales", subText: "State, Australia" },
  { type: "region", city: "", region: "England", country: "United Kingdom", displayName: "England", subText: "Region, UK" },
];

const POPULAR_QUICK_FILTERS = [
  { label: "🍁 Toronto, ON", city: "Toronto", region: "Ontario", country: "Canada", scope: "city" as const },
  { label: "🗺️ Ontario", city: "", region: "Ontario", country: "Canada", scope: "region" as const },
  { label: "🗽 New York, NY", city: "New York", region: "New York", country: "United States", scope: "city" as const },
  { label: "🌴 California", city: "", region: "California", country: "United States", scope: "region" as const },
  { label: "🌉 San Francisco", city: "San Francisco", region: "California", country: "United States", scope: "city" as const },
  { label: "🇬🇧 London, UK", city: "London", region: "England", country: "United Kingdom", scope: "city" as const },
];

export function LocationPartnerFilter({
  place,
  scope,
  onScopeChange,
  onPlaceChange,
}: {
  place: Place;
  scope: LocationScope;
  onScopeChange: (scope: LocationScope) => void;
  onPlaceChange: (place: Place) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<"search" | "dropdown">("search");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputId = useId();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options based on search query
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return PRESET_LOCATIONS.slice(0, 10);
    return PRESET_LOCATIONS.filter((item) => {
      const matchCity = item.city.toLowerCase().includes(q);
      const matchRegion = item.region.toLowerCase().includes(q);
      const matchCountry = item.country.toLowerCase().includes(q);
      const matchDisplay = item.displayName.toLowerCase().includes(q);
      return matchCity || matchRegion || matchCountry || matchDisplay;
    }).slice(0, 12);
  }, [searchQuery]);

  function handleSelectOption(opt: LocationOption) {
    if (opt.type === "city") {
      onPlaceChange({
        city: opt.city,
        region: opt.region,
        country: opt.country,
      });
      onScopeChange("city");
    } else if (opt.type === "region") {
      onPlaceChange({
        city: place.city || opt.region,
        region: opt.region,
        country: opt.country,
      });
      onScopeChange("region");
    } else {
      onPlaceChange({
        city: place.city,
        region: place.region,
        country: opt.country,
      });
      onScopeChange("country");
    }
    setSearchQuery("");
    setIsOpen(false);
  }

  function handleCustomSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // Check if query matches a known location
    const matched = PRESET_LOCATIONS.find(
      (item) =>
        item.displayName.toLowerCase() === query.toLowerCase() ||
        item.city.toLowerCase() === query.toLowerCase() ||
        item.region.toLowerCase() === query.toLowerCase(),
    );

    if (matched) {
      handleSelectOption(matched);
    } else {
      // Default to setting as City or Province/State
      onPlaceChange({
        city: query,
        region: place.region || query,
        country: place.country,
      });
      onScopeChange("city");
      setSearchQuery("");
      setIsOpen(false);
    }
  }

  function handleQuickPill(pill: (typeof POPULAR_QUICK_FILTERS)[number]) {
    onPlaceChange({
      city: pill.city || place.city || pill.region,
      region: pill.region,
      country: pill.country,
    });
    onScopeChange(pill.scope);
  }

  function handleResetWorldwide() {
    onScopeChange("worldwide");
    setSearchQuery("");
  }

  // Active filter badge description
  const activeLabel =
    scope === "city"
      ? `City: ${place.city || "Local City"}`
      : scope === "region"
        ? `Province/State: ${place.region || "State/Province"}`
        : scope === "country"
          ? `Country: ${place.country || "National"}`
          : "Worldwide (Any Location)";

  return (
    <div
      ref={wrapperRef}
      className="relative rounded-xl border border-line bg-surface/70 p-4 sm:p-5 flex flex-col gap-3.5 transition-all shadow-xs"
    >
      {/* Header with Scope Switcher & Filter Mode */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Compass className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-fg">
                Filter Partners by Location
              </h3>
              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px] py-0 px-1.5 font-semibold">
                {scope.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted">
              Select City or Province/State via search bar or dropdown
            </p>
          </div>
        </div>

        {/* Mode Toggle: Search Bar vs Dropdown Picker */}
        <div className="flex rounded-md border border-line p-0.5 bg-surface text-xs shrink-0 self-start sm:self-auto">
          <button
            type="button"
            className={`pressable px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
              filterMode === "search" ? "bg-subtle text-fg font-semibold shadow-xs" : "text-muted hover:text-fg"
            }`}
            onClick={() => setFilterMode("search")}
          >
            Search Bar
          </button>
          <button
            type="button"
            className={`pressable px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
              filterMode === "dropdown" ? "bg-subtle text-fg font-semibold shadow-xs" : "text-muted hover:text-fg"
            }`}
            onClick={() => setFilterMode("dropdown")}
          >
            Dropdown
          </button>
        </div>
      </div>

      {/* SEARCH BAR COMPONENT */}
      {filterMode === "search" ? (
        <div className="relative flex flex-col gap-1.5">
          <form onSubmit={handleCustomSearchSubmit} className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-emerald-400" />
            <Input
              id={searchInputId}
              type="text"
              value={searchQuery}
              placeholder="Search Province/State or City (e.g. Ontario, Toronto, California, New York…)"
              className="pl-9 pr-9 text-xs sm:text-sm font-medium h-11 bg-surface border-line focus-visible:ring-emerald-500/30"
              onFocus={() => setIsOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
            />
            {searchQuery ? (
              <button
                type="button"
                className="pressable absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg p-0.5"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : (
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-faint"
              />
            )}
          </form>

          {/* Autocomplete / Suggested Location Dropdown */}
          {isOpen && (
            <div className="absolute top-12 z-50 w-full overflow-hidden rounded-xl border border-line bg-surface/95 backdrop-blur-md shadow-lg">
              <div className="max-h-60 overflow-y-auto p-1.5 divide-y divide-line/40">
                {/* Option to clear to Worldwide */}
                <button
                  type="button"
                  className="pressable flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-subtle transition-colors"
                  onClick={() => {
                    handleResetWorldwide();
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-md bg-blue-500/10 text-blue-400">
                      <Globe className="size-3.5" />
                    </span>
                    <div>
                      <p className="font-semibold text-fg">Worldwide (Any Location)</p>
                      <p className="text-[11px] text-muted">Connect globally with anyone online</p>
                    </div>
                  </div>
                  {scope === "worldwide" && <Check className="size-4 text-emerald-400" />}
                </button>

                {searchResults.map((item) => {
                  const isCurrentCity =
                    scope === "city" &&
                    place.city.toLowerCase() === item.city.toLowerCase();
                  const isCurrentRegion =
                    scope === "region" &&
                    place.region.toLowerCase() === item.region.toLowerCase();
                  const selected = isCurrentCity || isCurrentRegion;

                  return (
                    <button
                      key={`${item.type}-${item.displayName}-${item.region}`}
                      type="button"
                      className={`pressable flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                        selected ? "bg-emerald-500/10 text-emerald-300 font-semibold" : "hover:bg-subtle text-fg"
                      }`}
                      onClick={() => handleSelectOption(item)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center rounded-md text-xs ${
                            item.type === "city"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-blue-500/10 text-blue-400"
                          }`}
                        >
                          {item.type === "city" ? <Building2 className="size-3.5" /> : <MapPin className="size-3.5" />}
                        </span>
                        <div className="truncate">
                          <p className="font-medium text-fg flex items-center gap-1.5 truncate">
                            <span>{item.displayName}</span>
                            <span className="text-[10px] text-faint uppercase font-normal">
                              ({item.type === "city" ? "City" : "Province / State"})
                            </span>
                          </p>
                          <p className="text-[11px] text-muted truncate">{item.subText}</p>
                        </div>
                      </div>
                      {selected && <Check className="size-4 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}

                {searchResults.length === 0 && searchQuery.trim() && (
                  <div className="p-3 text-center text-xs text-muted flex flex-col gap-1.5 items-center">
                    <p>No exact preset found for &quot;{searchQuery}&quot;</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      onClick={handleCustomSearchSubmit}
                    >
                      Filter by &quot;{searchQuery}&quot; anyway
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* SIMPLE DUAL DROPDOWNS COMPONENT (Filter Level + Selection) */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* 1. Dropdown for Filter Scope */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-faint" htmlFor="scope-select">
              Location Filter Level
            </label>
            <div className="relative">
              <select
                id="scope-select"
                value={scope}
                className="w-full appearance-none rounded-lg border border-line bg-surface px-3 py-2.5 text-xs font-semibold text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                onChange={(e) => onScopeChange(e.target.value as LocationScope)}
              >
                <option value="city">🏙️ Strictly Same City ({place.city || "City"})</option>
                <option value="region">🗺️ Same Province / State ({place.region || "State"})</option>
                <option value="country">🌐 Same Country ({place.country || "Country"})</option>
                <option value="worldwide">🌍 Worldwide (Any location)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-faint" />
            </div>
          </div>

          {/* 2. Dropdown for Choosing Province/State or City */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-faint" htmlFor="preset-select">
              Select Province/State or City Preset
            </label>
            <div className="relative">
              <select
                id="preset-select"
                className="w-full appearance-none rounded-lg border border-line bg-surface px-3 py-2.5 text-xs font-semibold text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  if (idx >= 0 && PRESET_LOCATIONS[idx]) {
                    handleSelectOption(PRESET_LOCATIONS[idx]);
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  Choose a City or Province/State…
                </option>
                <optgroup label="Canadian Provinces & Cities">
                  <option value="21">🗺️ Ontario (Province)</option>
                  <option value="0">🏙️ Toronto (Ontario)</option>
                  <option value="22">🗺️ British Columbia (Province)</option>
                  <option value="1">🏙️ Vancouver (BC)</option>
                  <option value="23">🗺️ Quebec (Province)</option>
                  <option value="2">🏙️ Montreal (Quebec)</option>
                  <option value="3">🏙️ Calgary (Alberta)</option>
                  <option value="4">🏙️ Ottawa (Ontario)</option>
                </optgroup>
                <optgroup label="US States & Cities">
                  <option value="25">🗺️ California (State)</option>
                  <option value="6">🏙️ Los Angeles (California)</option>
                  <option value="7">🏙️ San Francisco (California)</option>
                  <option value="26">🗺️ New York (State)</option>
                  <option value="5">🏙️ New York (City)</option>
                  <option value="27">🗺️ Texas (State)</option>
                  <option value="10">🏙️ Austin (Texas)</option>
                  <option value="28">🗺️ Florida (State)</option>
                  <option value="11">🏙️ Miami (Florida)</option>
                  <option value="29">🗺️ Washington (State)</option>
                  <option value="9">🏙️ Seattle (Washington)</option>
                  <option value="30">🗺️ Illinois (State)</option>
                  <option value="8">🏙️ Chicago (Illinois)</option>
                  <option value="12">🏙️ Boston (Massachusetts)</option>
                </optgroup>
                <optgroup label="International Metros">
                  <option value="14">🇬🇧 London, England</option>
                  <option value="15">🇦🇺 Sydney, NSW</option>
                  <option value="16">🇦🇺 Melbourne, Victoria</option>
                  <option value="17">🗼 Tokyo, Japan</option>
                  <option value="18">🇮🇳 Mumbai, Maharashtra</option>
                  <option value="19">🇩🇪 Berlin, Germany</option>
                  <option value="20">🇫🇷 Paris, France</option>
                </optgroup>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-faint" />
            </div>
          </div>
        </div>
      )}

      {/* Quick Location Pills */}
      <div className="flex flex-col gap-1.5 pt-1">
        <p className="text-[11px] font-medium text-faint flex items-center gap-1">
          <Sparkles className="size-3 text-amber-400" />
          <span>Quick popular regional filters:</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_QUICK_FILTERS.map((pill) => {
            const active =
              scope === pill.scope &&
              (pill.scope === "city"
                ? place.city.toLowerCase() === pill.city.toLowerCase()
                : place.region.toLowerCase() === pill.region.toLowerCase());

            return (
              <button
                key={pill.label}
                type="button"
                className={`pressable rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                  active
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold shadow-xs ring-1 ring-emerald-500/40"
                    : "border-line bg-surface text-muted hover:border-faint hover:text-fg"
                }`}
                onClick={() => handleQuickPill(pill)}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ACTIVE PARTNER LOCATION FILTER STATUS BAR */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-line/60 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-muted truncate">
            Target partner filter:{" "}
            <strong className="text-emerald-300 font-semibold">{activeLabel}</strong>
          </span>
        </div>

        {scope !== "worldwide" && (
          <button
            type="button"
            className="pressable text-xs text-muted hover:text-fg flex items-center gap-1 shrink-0 font-medium underline"
            onClick={handleResetWorldwide}
          >
            <X className="size-3 text-faint" />
            <span>Reset Worldwide</span>
          </button>
        )}
      </div>
    </div>
  );
}

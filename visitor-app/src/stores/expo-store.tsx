"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface CoreState {
  interests: string[];
  itinerary: string[];
  checkins: string[];
  currentBoothId: string;
}

interface ExpoStore extends CoreState {
  mapFrom: string;
  mapTo: string;
  ready: boolean;
  toggleInterest: (id: string) => void;
  addToItinerary: (id: string) => void;
  addManyToItinerary: (ids: string[]) => void;
  removeFromItinerary: (id: string) => void;
  toggleCheckin: (id: string) => void;
  setMapFrom: (id: string) => void;
  setMapTo: (id: string) => void;
  setCurrentBooth: (id: string) => void;
  isInterested: (id: string) => boolean;
  inItinerary: (id: string) => boolean;
}

const EMPTY: CoreState = {
  interests: [],
  itinerary: [],
  checkins: [],
  currentBoothId: "02",
};

const STORAGE_KEY = "expo-guide.visitor-state.v1";
const Ctx = createContext<ExpoStore | null>(null);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseStoredState(raw: string | null): CoreState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CoreState>;
    if (
      !isStringArray(value.interests) ||
      !isStringArray(value.itinerary) ||
      !isStringArray(value.checkins) ||
      typeof value.currentBoothId !== "string"
    ) {
      return null;
    }
    return {
      interests: value.interests,
      itinerary: value.itinerary,
      checkins: value.checkins,
      currentBoothId: value.currentBoothId,
    };
  } catch {
    return null;
  }
}

export function ExpoStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CoreState>(EMPTY);
  const [mapFrom, setMapFrom] = useState("01");
  const [mapTo, setMapTo] = useState("75");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function hydrate() {
      await Promise.resolve();
      if (!active) return;
      let stored: CoreState | null = null;
      try {
        stored = parseStoredState(window.localStorage.getItem(STORAGE_KEY));
      } catch {
        // Storage can be disabled by browser privacy settings.
      }
      if (stored) setState(stored);
      setReady(true);
    }
    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Keep the in-memory session usable when persistent storage is disabled.
    }
  }, [ready, state]);

  const value = useMemo<ExpoStore>(() => {
    const toggleRelation = (field: "interests" | "checkins") => (id: string) => {
      setState((current) => {
        const selected = current[field].includes(id);
        return {
          ...current,
          [field]: selected
            ? current[field].filter((item) => item !== id)
            : [...current[field], id],
        };
      });
    };

    return {
      ...state,
      mapFrom,
      mapTo,
      ready,
      toggleInterest: toggleRelation("interests"),
      toggleCheckin: toggleRelation("checkins"),
      addToItinerary: (id) =>
        setState((current) =>
          current.itinerary.includes(id)
            ? current
            : { ...current, itinerary: [...current.itinerary, id] },
        ),
      addManyToItinerary: (ids) =>
        setState((current) => {
          const newTrip = ids.filter((id) => !current.itinerary.includes(id));
          const newInterests = ids.filter((id) => !current.interests.includes(id));
          return {
            ...current,
            itinerary: [...current.itinerary, ...newTrip],
            interests: [...current.interests, ...newInterests],
          };
        }),
      removeFromItinerary: (id) =>
        setState((current) => ({
          ...current,
          itinerary: current.itinerary.filter((item) => item !== id),
        })),
      setMapFrom,
      setMapTo,
      setCurrentBooth: (id) =>
        setState((current) => ({ ...current, currentBoothId: id })),
      isInterested: (id) => state.interests.includes(id),
      inItinerary: (id) => state.itinerary.includes(id),
    };
  }, [state, mapFrom, mapTo, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useExpoStore(): ExpoStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useExpoStore must be used within ExpoStoreProvider");
  return ctx;
}

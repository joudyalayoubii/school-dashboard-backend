"use client";

import { createContext, useContext } from "react";

// null means "act on the caller's own school" (SCHOOL_ADMIN); a value means
// a SUPER_ADMIN is impersonating that specific school.
const SchoolIdContext = createContext<string | null>(null);

export const SchoolIdProvider = SchoolIdContext.Provider;

export const useEffectiveSchoolId = (): string | null => useContext(SchoolIdContext);

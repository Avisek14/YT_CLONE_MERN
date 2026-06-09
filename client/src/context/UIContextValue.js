import { createContext } from "react"

// The raw context lives separately so the provider module can stay Fast Refresh friendly.
export const UIContext = createContext()

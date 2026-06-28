'use client'
import { createContext, useContext } from 'react'

const SlugContext = createContext<string>('')

export function SlugProvider({ children, value }: { children: React.ReactNode; value: string }) {
  return <SlugContext.Provider value={value}>{children}</SlugContext.Provider>
}

export const useSlug = () => useContext(SlugContext)

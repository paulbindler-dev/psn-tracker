'use client'
import { createContext, useContext } from 'react'

const SlugContext = createContext<string>('')
export const SlugProvider = SlugContext.Provider
export const useSlug = () => useContext(SlugContext)

import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <>
      <Head>
        <title>404 - Page Not Found</title>
        <meta name="description" content="Page not found" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">404</h1>
          <p className="text-lg text-gray-600">Pagina non trovata</p>
          <p className="text-sm text-gray-500">
            Sembra che la pagina che stai cercando non esista o sia stata spostata.
          </p>
        </div>
      </main>
    </>
  )
}

import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import NatureBackgroundEditorClient from "./NatureBackgroundEditorClient";

export const metadata: Metadata = {
  title: "Nature Background Editor | AI Outdoor Photo Maker",
  description:
    "Place your photo into natural outdoor scenes with AI background removal and a ready-made nature gallery.",
  keywords: [
    "background editor",
    "background remover",
    "nature background editor",
    "AI background changer",
    "outdoor photo maker",
    "photo background replacement",
  ],
  openGraph: {
    title: "Nature Background Editor - Lumina AI",
    description:
      "Upload a photo, choose a nature scene, and export a finished outdoor image.",
    url: "https://rony.studio/tools/background-editor",
  },
};

export default function NatureBackgroundEditorPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-950">
      <Navbar />

      <main className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-7xl">
          <nav className="mb-5 text-sm text-slate-500">
            <Link href="/" className="hover:text-sky-700">
              Home
            </Link>{" "}
            / <span>Tools</span> /{" "}
            <span className="text-sky-700">Nature Background Editor</span>
          </nav>

          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
              Lumina AI Tool
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-normal text-slate-950 sm:text-5xl">
              Nature Background Editor
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Build outdoor portraits from your own photo and a curated nature
              gallery.
            </p>
          </div>

          <NatureBackgroundEditorClient />
        </section>
      </main>
    </div>
  );
}

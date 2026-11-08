# FrantoS — Private Creative Workspace

> **An architectural digital sanctuary, creative feed, spatial moodboard, and project cockpit crafted for multidisciplinary designers, creative technologists, audio engineers, and digital artists.**

[![Live Production](https://img.shields.io/badge/Live%20Production-Vercel-black?style=for-the-badge&logo=vercel)](https://frantos-private-creative-workspace.vercel.app/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.174-white?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

---

## 🌐 Live Production

- **URL:** [https://frantos-private-creative-workspace.vercel.app/](https://frantos-private-creative-workspace.vercel.app/)
- **Deployment Platform:** Vercel
- **Current Mode:** **Demo Mode** (local persistence and offline-first state management enabled by default)

---

## FrantoS 2.0 — Behind the work (branch `frantos-2.0`)

A private workspace for designers, motion & 3D artists and small studios. The demo project **FORM / 01** is built around one procedural 3D object (`src/frantos2/form/formScene.ts`). The same scene renders the clay study, v1 (lacquer, hard key), v2 (satin, soft key), the poster object and the 8 s turntable loop, and it runs live in the landing hero on desktop.

| Route | What it is |
| :--- | :--- |
| `/#/` | Landing: poster with a lifted corner → layers (clay → references → review note → project screen); scenes Collect / Refine / Present |
| `/#/app` | Workspace home: continue where you left off, notes that need attention, active work, Create |
| `/#/p/:id` · `/materials` · `/moodboard` · `/review/:work` · `/stories` | Project: overview (orbit / grid), materials + context inspector, moodboard, review, Stories |
| `/#/p/:id/review/:work?v=&cmp=&c=` | Deep link to a version, an A/B comparison and a specific note |
| `/#/p/:id/present/:n`, `/#/p/:id/stories/play/:n` | Clean presentation / Story playback |
| `/#/after-hours`, `/#/studio`, `/#/story` | First-stage photo story demo (still works) |
| `/#/overview` … | Original atelier v1, lazy-loaded |

**Review:** A/B divider (the camera never moves), notes pinned in the work's own 0–1 coordinates, timecode notes on motion with seek-on-click, per-version notes, resolve / reopen, replies, approve. From a version: Story frame, presentation, portfolio pick, all without re-uploading.

**Storage:** local-first. Metadata in IndexedDB `frantos-ws-v1`, files as blobs `blob:<id>`. Undo for deletes and moves (toast or ⌘/Ctrl+Z); orphaned blobs are cleaned up on the next start. There is no server, so there are no invites, share links or publishing, and the UI says so.

**Asset tools:** `tools/render-form.html` and `tools/render-poster.html` (open via `npm run dev`) re-render the object and the poster.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Target Users](#target-users)
- [Key Features](#key-features)
  - [Creative Core 3D](#creative-core-3d)
  - [Six Creative Disciplines](#six-creative-disciplines)
  - [Creative Feed & Discovery](#creative-feed--discovery)
  - [WIP Stories & Process Viewer](#wip-stories--process-viewer)
  - [Creator Profiles](#creator-profiles)
  - [Project Workspace & Task Cockpit](#project-workspace--task-cockpit)
  - [Spatial Moodboard](#spatial-moodboard)
  - [Creative Weather & Web Audio Ambience](#creative-weather--web-audio-ambience)
  - [Interactions & Social Polish](#interactions--social-polish)
- [Architecture & Storage Strategy](#architecture--storage-strategy)
  - [Demo Mode vs. Supabase Integration](#demo-mode-vs-supabase-integration)
  - [Local Persistence](#local-persistence)
  - [File Upload Behavior](#file-upload-behavior)
- [Design, Accessibility & Performance](#design-accessibility--performance)
- [Technology Stack](#technology-stack)
- [Project Directory Structure](#project-directory-structure)
- [Getting Started Locally](#getting-started-locally)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Development Server](#development-server)
  - [Production Build](#production-build)
- [Environment Variables](#environment-variables)
- [Connecting Supabase (Optional Production Setup)](#connecting-supabase-optional-production-setup)
- [Deploying to Vercel](#deploying-to-vercel)
- [Demo Mode Limitations](#demo-mode-limitations)
- [Current Implementation Status](#current-implementation-status)
- [Future Roadmap](#future-roadmap)
- [License & Project Ownership](#license--project-ownership)

---

## 💡 Overview

**FrantoS** is a private, monolithic creative workspace designed to bridge the gap between creative portfolio presentation, daily studio task tracking, visual brainstorming, and sensory focus. 

Traditional portfolio sites isolate finished works from the raw creative process, while generic project management tools lack aesthetic refinement. FrantoS solves this by uniting:
1. **Curated Showcase & Process Sharing**: Real-time exhibits paired with ephemeral 24-hour work-in-progress (WIP) stories.
2. **Interactive 3D Discipline Navigation**: A procedural WebGL visualizer mapping distinct creative fields into kinetic geometry.
3. **Integrated Studio Cockpit**: Direct action bridges allowing creators to pin feed artifacts straight to spatial moodboards or convert feedback into actionable workspace tasks.
4. **Sensory Environmental State**: Generative Web Audio soundscapes and creative weather indicators supporting deep flow sessions.

---

## 🎯 Target Users

- **Multidisciplinary Designers**: Hybrid creatives moving between UI/UX, brand design, spatial layouts, and motion graphics.
- **Creative Technologists & Shader Developers**: Developers showcasing generative code, Three.js experiments, and interactive installations.
- **Sound Designers & Audio Producers**: Artists sharing synthesizer patches, procedural audio clips, and audiovisual experiments.
- **Studio Leads & Art Directors**: Independent creators managing project milestones, visual research moodboards, and team critiques in a unified workspace.

---

## ✨ Key Features

### 🎨 Creative Core 3D
- Built with **Three.js** and WebGL.
- Procedural floating particle universe with custom vertex/fragment responsive geometry.
- Interactive raycasting detecting cursor focus and trigger events.
- Kinetic spring animations dynamically reacting to selected disciplines.
- Automatic fallback and frozen kinetic cycles when `prefers-reduced-motion: reduce` is detected.

### 📐 Six Creative Disciplines

| Discipline | Key Aesthetic | 3D Visual Geometry | Focus Area |
| :--- | :--- | :--- | :--- |
| **Motion** | `#F43F5E` (Rose) | Kinetic Torus Ring | Kinetic typography, temporal transitions, fluid simulation |
| **Sound & Synth** | `#8B5CF6` (Violet) | Octahedral Resonator | Ambient soundscapes, modular patches, audio synthesis |
| **Spatial & 3D** | `#06B6D4` (Cyan) | Icosahedron Wireframe | Architectural environments, WebGL art, product staging |
| **Creative Code** | `#10B981` (Emerald) | Algorithmic Dodecahedron | Shaders, generative systems, interactive web engineering |
| **Brand Identity** | `#F59E0B` (Amber) | Minimalist Cube Structure | Visual systems, typographic guidelines, brand collateral |
| **Generative Art** | `#EC4899` (Pink) | Parametric Torus Knot | Autonomous algorithms, neural visuals, fractal geometry |

### 🖼️ Creative Feed & Discovery
- **Dual View Modes**: Switch between high-impact media **Grid View** and dense analytical **Dense List View**.
- **Discipline Filtering**: Instant single-click filtering across all six creative fields.
- **Status Filtering**: Filter by `All`, `WIP Process`, `Finished Artifacts`, `Saved`, or `My Uploads`.
- **Sorting Engine**: Order items by Most Recent, Likes, Saves, or View Engagement.
- **Instant Search**: Real-time client-side search across titles, author names, descriptions, and tags.
- **Recently Inspected Strip**: Quick-access drawer preserving recently viewed exhibits with one-click clear.

### ⏱️ WIP Stories & Process Viewer
- 24-hour ephemeral progress updates showcasing behind-the-scenes experiments.
- Segmented progress bar with auto-advance and pause-on-hold functionality.
- Full keyboard support:
  - `Escape`: Close Story Viewer.
  - `ArrowLeft` / `ArrowRight`: Navigate previous / next story.
  - `Spacebar`: Toggle pause / resume playback.
- Story creation modal supporting direct local image pickers and custom progress percentages.
- Contextual actions directly inside the viewer: **Pin to Moodboard** and **Send to Workspace**.

### 👤 Creator Profiles
- Comprehensive creator modal with custom avatar, cover banner, biography, discipline badges, and toolstack tags.
- Quick tabbed overview of the creator's published exhibits and work-in-progress projects.
- Live profile customization with local state persistence.

### 📊 Project Workspace & Task Cockpit
- Integrated task management supporting four status columns: **To Do**, **In Progress**, **Review**, and **Completed**.
- Priority scoring (`High`, `Medium`, `Low`) with estimated duration and discipline tagging.
- Interactive creation modal to log new development tasks or link them directly to feed exhibits.
- Task status cycling and inline deletion with immediate local database synchronization.

### 📌 Spatial Moodboard
- Infinite spatial canvas featuring free-form movable nodes.
- Diverse card formats: Media Cards, Color Palettes, Typography Specimens, and Markdown Sticky Notes.
- Seamless **"Pin to Moodboard"** actions originating from any feed card or story.
- Live canvas reset, node creation, and position persistence.

### 🌤️ Creative Weather & Web Audio Ambience
- **Generative Web Audio Synthesizer**: Multi-oscillator harmonic and binaural drone engine with dedicated low-pass filters and gain stages.
- **Four Ambient Presets**:
  - *Focus Horizon (432 Hz)*: Grounded concentration frequency.
  - *Flow Stream (528 Hz)*: Theta-wave generative harmonic resonance.
  - *Deep Stillness (174 Hz)*: Low-frequency ambient grounding.
  - *Hyper Drive (639 Hz)*: High-frequency energetic stimulation.
- **Creative Metrics**: Real-time atmospheric indicators reflecting Creative Flow State, Ambient Pressure Index, and Atmospheric Color Temperatures.
- **Strict Audio Lifecycle**: Guaranteed unmount cleanup preventing lingering audio when switching tabs or closing widgets.

### ❤️ Interactions & Social Polish
- **Double-Tap Heart Burst**: Instagram-style double-click gesture triggering floating particle animations.
- **Bookmark & Collection System**: Persisted bookmarks accessible under the "Saved" filter.
- **Comment Threads**: Timestamped discussion threads on every project modal with immediate comment authoring.
- **Toast Feedback**: Non-intrusive micro-toasts confirming user actions across the app.

---

## 🏛️ Architecture & Storage Strategy

### Demo Mode vs. Supabase Integration

```
                               ┌────────────────────────────────────────┐
                               │           FrantoS Application          │
                               └───────────────────┬────────────────────┘
                                                   │
                                                   ▼
                               ┌────────────────────────────────────────┐
                               │      supabaseClient.ts (Service)       │
                               └───────┬────────────────────────┬───────┘
                                       │                        │
                    (Demo Mode Default)│                        │(When Configured)
                                       ▼                        ▼
                      ┌─────────────────────────┐    ┌────────────────────┐
                      │   HTML5 localStorage    │    │  Supabase Cloud    │
                      │   & File API Preview    │    │  • PostgreSQL DB   │
                      │   (Offline First)       │    │  • Supabase Auth   │
                      └─────────────────────────┘    │  • S3 Storage      │
                                                     └────────────────────┘
```

- **Current State (Demo Mode)**: The repository is configured to run out-of-the-box in **Demo Mode**. All exhibits, stories, tasks, moodboard pins, and profiles are read from and written to `localStorage`.
- **Supabase-Ready**: The service layer (`src/services/supabaseClient.ts`) contains clean interface boundaries. When Supabase environment variables are provided, real database calls and Supabase Storage bucket uploads can be enabled without refactoring application components.

### 💾 Local Persistence

The application preserves your workspace state across browser refreshes and tab reloads using standardized storage keys:

- `frantos_exhibits_v2`: Custom user-created and updated exhibits.
- `frantos_stories_v2`: Active and created WIP stories.
- `frantos_tasks_v2`: Workspace tasks and completion statuses.
- `frantos_moodboard_v2`: Draggable spatial moodboard items.
- `frantos_comments_v2`: Threaded user comments.
- `frantos_theme_mode`: User theme preference (`dark` / `light`).
- `frantos_saved_items` & `frantos_liked_items`: Bookmarked and liked IDs.

### 📁 File Upload Behavior

- **Demo Mode**: When uploading cover images or story media, files selected via the native device file picker are parsed by the browser's `FileReader` API and converted into local data URLs / cached object references.
- **Cloud Mode**: Once Supabase Storage is configured, files will be uploaded directly to the `workspace-artifacts` bucket and return permanent public CDN URLs.

---

## ♿ Design, Accessibility & Performance

- **Typography & Scale**: Pairings utilizing modern geometric sans-serif fonts with strict mathematical step ratios.
- **Themes**: Fully realized **Dark Theme** (deep slate/zinc tones with subtle luminous borders) and **Light Theme** (warm off-white architectural canvases).
- **Accessibility**:
  - Full keyboard `Escape` closing handlers on all six modals.
  - Arrow key navigation and spacebar controls in the Story Viewer.
  - WCAG AA contrast compliance across both color modes.
  - `prefers-reduced-motion`: Disables Three.js scene particle rotation, reduces mesh float amplitudes, and replaces fast spring transitions with subtle opacity fades.
- **Native Cursor**: Retains responsive browser cursor states across all buttons, sliders, inputs, and interactive canvas surfaces.
- **Hash-Based Deep Routing**: Supports direct link refresh and browser Back/Forward navigation (`#/feed`, `#/workspace`, `#/moodboard`, `#/weather`).

---

## 🛠️ Technology Stack

| Category | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | [React](https://reactjs.org/) | `19.0.0` | Component hierarchy & state management |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | `5.7.3` | Static type safety across all interfaces |
| **Bundler & Dev Server** | [Vite](https://vitejs.dev/) | `6.2.0` | Ultra-fast HMR and production asset bundling |
| **3D Graphics** | [Three.js](https://threejs.org/) | `0.174.0` | WebGL canvas, particle systems, procedural meshes |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | `3.4.17` | Utility-first responsive styling system |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) | `12.4.7` | UI micro-interactions, layout transitions, modal enters |
| **Icons** | [Lucide React](https://lucide.dev/) | `1.16.0` | Consistent iconography |
| **Audio Engine** | Web Audio API | Native Browser | Generative oscillator sound synthesizer |
| **Celebratory FX** | [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti) | `1.9.4` | Particle bursts for heart interactions |

---

## 📁 Project Directory Structure

```
frantos-creative-workspace/
├── public/                      # Static assets & favicon icons
├── src/
│   ├── components/
│   │   ├── auth/                # Auth Modal & Demo Mode persona switcher
│   │   ├── common/              # Global Header, ImageUploader, Toast notifications
│   │   ├── core/                # Three.js Creative Core 3D canvas & shaders
│   │   ├── feed/                # Feed cards, detail modal, new exhibit modal
│   │   ├── moodboard/           # Infinite spatial canvas & draggable cards
│   │   ├── profile/             # Creator Profile modal & editor
│   │   ├── stories/             # WIP Stories bar, Story Viewer, Story Creator
│   │   ├── weather/             # Creative Weather widget & Web Audio synthesizer
│   │   └── workspace/           # Project Task Cockpit & Kanban board
│   ├── data/
│   │   └── mockData.ts          # Seed data for exhibits, stories, tasks, disciplines
│   ├── services/
│   │   └── supabaseClient.ts    # Storage & database abstraction layer
│   ├── types.ts                 # Core TypeScript interfaces & domain models
│   ├── App.tsx                  # Root application controller & hash router
│   ├── main.tsx                 # React 19 application entry point
│   └── index.css                # Tailwind directives & global theme variables
├── .gitignore                   # Ignored files (node_modules, dist, .env)
├── metadata.json                # Application metadata & capabilities
├── package.json                 # Scripts and dependency declarations
├── tsconfig.json                # TypeScript compiler configuration
├── vite.config.ts               # Vite bundler configuration
└── README.md                    # Project documentation
```

---

## 🚀 Getting Started Locally

### Prerequisites

- [Node.js](https://nodejs.org/) (version `18.0.0` or higher recommended)
- `npm` (version `9.0.0` or higher)

### Installation

Clone the repository and install all dependencies:

```bash
git clone https://github.com/your-username/frantos-creative-workspace.git
cd frantos-creative-workspace
npm install
```

### Development Server

Run the local development server:

```bash
npm run dev
```

The application will start at: `http://localhost:3000`

### Production Build

Compile TypeScript and build the production bundle:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

## 🔐 Environment Variables

By default, FrantoS runs fully in **Demo Mode** with zero environment variables required.

If you wish to link the workspace to a live Supabase backend, create a `.env.local` file in the project root:

```env
# Optional Supabase Integration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> ⚠️ **Security Notice**: Never commit real secret keys or service role tokens to version control. The `.gitignore` file is configured to exclude all `.env` and `.env.local` files.

---

## 🔌 Connecting Supabase (Optional Production Setup)

To transition from local Demo Mode to live cloud persistence:

1. **Create a Supabase Project**: Visit [supabase.com](https://supabase.com) and create a new project.
2. **Configure Storage Bucket**:
   - In the Supabase Dashboard, navigate to **Storage**.
   - Create a public bucket named `workspace-artifacts`.
   - Set public read access permissions for media assets.
3. **Set Up Database Tables**:
   - Create tables matching the TypeScript models in `src/types.ts` (`exhibits`, `stories`, `tasks`, `moodboard_items`, `comments`).
4. **Set Environment Variables**:
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your environment settings on Vercel or in your local `.env.local`.

---

## ☁️ Deploying to Vercel

FrantoS is optimized for one-click deployment on [Vercel](https://vercel.com/):

1. Push your code to a GitHub / GitLab repository.
2. Import the repository into your Vercel Dashboard.
3. Configure the build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. *(Optional)* Add any Supabase environment variables in the Vercel Project Settings under **Environment Variables**.
5. Click **Deploy**.

---

## ⚠️ Demo Mode Limitations

When using the application in default Demo Mode:
- **Client-Side Persistence**: All newly authored exhibits, stories, tasks, and moodboard items persist within the active browser's `localStorage`. Clearing browser data or using Incognito mode will reset the state to default seed data.
- **Local File Uploads**: Uploaded images are stored as local data URLs for immediate preview. They are not hosted on an external CDN until Supabase Storage credentials are configured.
- **Simulated Persona Auth**: Signing in switches the active creator profile locally to demonstrate role-based permissions without contacting an external authentication provider.

---

## 📈 Current Implementation Status

- [x] Three.js Creative Core with 6 procedural discipline geometries
- [x] Creative Feed with Grid and Dense layout toggles
- [x] Multi-facet discipline and status filtering (WIP, Finished, Saved, Mine)
- [x] Sorting by Recent, Likes, Saves, and Views
- [x] WIP Stories bar with auto-advancing progress timers & keyboard navigation
- [x] Story Creation Modal with local image preview
- [x] Exhibit Detail Modal with high-res media display & comment threading
- [x] Creator Profile modal with live bio and toolstack editing
- [x] Workspace Task Cockpit with status columns & priority tagging
- [x] Spatial Moodboard with free-form movable cards
- [x] Direct Action Bridges: "Pin to Moodboard" & "Send to Workspace"
- [x] Double-tap heart burst animations
- [x] Creative Weather widget with generative Web Audio synthesizer
- [x] Dark & Light themes with persistent state
- [x] Hash-based URL routing (`#/feed`, `#/workspace`, `#/moodboard`, `#/weather`)
- [x] Full accessibility with `Escape` key handlers and `prefers-reduced-motion`
- [x] Complete mobile and tablet responsive layouts

---

## 🗺️ Future Roadmap

- [ ] Real-time multi-user cursor collaboration on the Spatial Moodboard.
- [ ] Direct WebGL shader editor with in-browser GLSL compilation.
- [ ] Exportable workspace reports (PDF and Markdown format).
- [ ] Supabase Realtime subscriptions for live multi-device synchronization.
- [ ] Direct integration with Figma, GitHub, and Blender asset pipelines.

---

## 📄 License & Project Ownership

Copyright © 2026 **FrantoS Studio**. All rights reserved.

Created for creative technologists, designers, and digital artisans seeking a dedicated, distraction-free digital workspace.

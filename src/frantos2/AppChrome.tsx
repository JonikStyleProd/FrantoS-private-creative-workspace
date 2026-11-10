import React from 'react';
import { Toaster } from './ws/kit';
import { UploadTray } from './ws/uploads';
import { GlobalHelp } from './kits/Help';

/** Toasts and the upload tray — only on screens that can produce them. */
export default function AppChrome() {
  return (
    <>
      <Toaster />
      <UploadTray />
      <GlobalHelp />
    </>
  );
}

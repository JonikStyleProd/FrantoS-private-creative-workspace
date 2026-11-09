import React from 'react';
import { CloudBoot } from './Account';
import { setNotifier } from './sync';
import { toast } from '../ws/kit';

setNotifier((m) => toast(m));

/** Loaded lazily so the landing page never pays for the Supabase client. */
export default function CloudLayer() {
  return <CloudBoot />;
}

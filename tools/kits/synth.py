# A 24-second, 112 BPM track for the Velo demo: kick on every beat, hats on the offbeats,
# a warm bass line and a slow pad. Written as WAV, encoded to M4A by ffmpeg.
import math, struct, wave, random
SR=44100; BPM=112; BEAT=60/BPM; DUR=24
n=int(SR*DUR); buf=[0.0]*n
def add(i,v):
    if 0<=i<n: buf[i]+=v
def kick(t0):
    s=int(t0*SR)
    for k in range(int(0.35*SR)):
        t=k/SR; f=110*math.exp(-t*18)+42
        add(s+k, 0.9*math.sin(2*math.pi*f*t)*math.exp(-t*9))
def hat(t0,amp=0.18):
    s=int(t0*SR); r=random.Random(int(t0*1000))
    for k in range(int(0.05*SR)):
        add(s+k, amp*(r.random()*2-1)*math.exp(-k/SR*90))
notes=[41.2,41.2,49.0,36.7]  # E1 E1 G1 D1, one bar each
def bass(t0,f,length):
    s=int(t0*SR)
    for k in range(int(length*SR)):
        t=k/SR; env=min(1,t*40)*math.exp(-t*2.2)
        add(s+k, 0.32*env*(math.sin(2*math.pi*f*2*t)+0.35*math.sin(2*math.pi*f*4*t)))
def pad(t0,fs,length):
    s=int(t0*SR)
    for k in range(int(length*SR)):
        t=k/SR; env=min(1,t/1.2)*min(1,(length-t)/1.2)
        add(s+k, 0.05*env*sum(math.sin(2*math.pi*f*t+0.3*math.sin(2*math.pi*0.2*t)) for f in fs))
beats=int(DUR/BEAT)
for b in range(beats):
    t=b*BEAT
    if b>=4: kick(t)
    hat(t+BEAT/2, 0.16 if b>=8 else 0.08)
    if b%4==0 and b>=8: bass(t, notes[(b//4)%4], BEAT*3.5)
chords=[[164.8,196.0,246.9],[164.8,196.0,246.9],[196.0,246.9,293.7],[146.8,185.0,220.0]]
for bar in range(beats//4):
    pad(bar*4*BEAT, chords[bar%4], 4*BEAT)
peak=max(abs(x) for x in buf)
w=wave.open('velo-track.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
w.writeframes(b''.join(struct.pack('<h',int(32000*x/peak*0.9)) for x in buf)); w.close()

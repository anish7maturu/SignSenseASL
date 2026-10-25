# Makes Finn's voice recordings in voice/ with the Kokoro-82M text-to-speech model.
#   node tools/voice-lines.js index.html > lines.json
#   python3 tools/make-voice.py lines.json voice af_heart
# Needs: pip install kokoro-onnx soundfile, ffmpeg, and next to this script
# kokoro-q8.onnx (the model) and voices.npz (the voice styles). Existing
# files are skipped, so delete a file to make it again.
import json,sys,os,subprocess,tempfile
import soundfile as sf
from kokoro_onnx import Kokoro
T=os.path.dirname(os.path.abspath(__file__))
lines=json.load(open(sys.argv[1]));out=sys.argv[2];voice=sys.argv[3];
os.makedirs(out,exist_ok=True)
k=Kokoro(T+'/kokoro-q8.onnx',T+'/voices.npz')
trim='silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,apad=pad_dur=0.06'
for name,text in lines.items():
    dst=f'{out}/{name}.mp3'
    if os.path.exists(dst) and os.path.getsize(dst)>0:continue
    if not text:
        subprocess.run(['ffmpeg','-loglevel','error','-y','-f','lavfi','-i','anullsrc=r=24000:cl=mono','-t','0.15','-b:a','32k',dst],check=True);continue
    a,sr=k.create(text,voice=voice,speed=0.95 if name.startswith('letter-') or name in('again','turn') else 1.0,lang='en-us')
    with tempfile.NamedTemporaryFile(suffix='.wav') as f:
        sf.write(f.name,a,sr)
        subprocess.run(['ffmpeg','-loglevel','error','-y','-i',f.name,'-af',trim,'-ac','1','-b:a','48k',dst],check=True)
    print(name,flush=True)

import React from 'react';
import { GhostType } from '../types';

interface GhostFaceProps {
  ghostType: GhostType;
  className?: string;
  isJumpscare?: boolean;
}

export const GhostFace: React.FC<GhostFaceProps> = ({ ghostType, className = '', isJumpscare = false }) => {
  return (
    <div className={`relative flex items-center justify-center select-none overflow-hidden ${className}`}>
      {/* Background shadow aura */}
      <div className={`absolute inset-0 rounded-full blur-2xl opacity-80 pointer-events-none ${
        ghostType === 'POCONG' 
          ? 'bg-red-950/80 animate-pulse' 
          : ghostType === 'KUNTILANAK' 
          ? 'bg-cyan-950/80 animate-pulse' 
          : 'bg-orange-950/90 animate-pulse'
      }`} />

      {/* SVG Face Illustrations */}
      {ghostType === 'POCONG' && (
        <svg
          viewBox="0 0 320 380"
          className={`w-full h-full filter drop-shadow-[0_0_40px_rgba(220,38,38,0.9)] ${
            isJumpscare ? 'animate-bounce' : ''
          }`}
          style={{ animationDuration: isJumpscare ? '0.12s' : '2s' }}
        >
          <defs>
            <radialGradient id="pocongSkin" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#4a554a" />
              <stop offset="50%" stopColor="#2e3830" />
              <stop offset="85%" stopColor="#18201a" />
              <stop offset="100%" stopColor="#080c09" />
            </radialGradient>
            <radialGradient id="eyeGlowPocong" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff0000" />
              <stop offset="35%" stopColor="#990000" />
              <stop offset="100%" stopColor="#000000" />
            </radialGradient>
            <linearGradient id="clothTexture" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d4d4cc" />
              <stop offset="30%" stopColor="#9e9e90" />
              <stop offset="70%" stopColor="#575950" />
              <stop offset="100%" stopColor="#262722" />
            </linearGradient>
            <linearGradient id="bloodDrip" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff1111" />
              <stop offset="70%" stopColor="#880000" />
              <stop offset="100%" stopColor="#3b0000" />
            </linearGradient>
          </defs>

          {/* Top Shroud Knot (Ikatan Pocong Atas) */}
          <ellipse cx="160" cy="35" rx="36" ry="24" fill="url(#clothTexture)" stroke="#1a1c18" strokeWidth="4" />
          <path d="M 124 35 Q 160 15 196 35 Q 180 8 160 5 Q 140 8 124 35" fill="#a8a89c" />
          <line x1="140" y1="20" x2="180" y2="45" stroke="#4a2511" strokeWidth="5" />
          <line x1="142" y1="42" x2="178" y2="22" stroke="#4a2511" strokeWidth="5" />
          {/* Shroud Tie Rope */}
          <ellipse cx="160" cy="55" rx="28" ry="8" fill="#5c4028" stroke="#1f140a" strokeWidth="3" />

          {/* Burial Shroud Head Hood Outer */}
          <path
            d="M 65 170 C 60 70, 110 50, 160 50 C 210 50, 260 70, 255 170 C 250 250, 225 320, 160 330 C 95 320, 70 250, 65 170 Z"
            fill="url(#clothTexture)"
            stroke="#1c1f19"
            strokeWidth="5"
          />

          {/* Shroud dirt and blood splatters */}
          <path d="M 75 120 Q 90 140 80 180 Q 70 150 75 120" fill="#3b1f13" opacity="0.8" />
          <path d="M 235 110 Q 250 150 240 190 Q 230 160 235 110" fill="#5c1010" opacity="0.85" />
          <path d="M 120 60 Q 160 75 200 62 Q 160 70 120 60" fill="#2d2e27" />

          {/* Face Hole Opening in the Shroud (Robekan Kafan) */}
          <ellipse cx="160" cy="180" rx="68" ry="88" fill="#000000" stroke="#222" strokeWidth="6" />

          {/* Decayed Rotting Face Inside */}
          <ellipse cx="160" cy="180" rx="64" ry="82" fill="url(#pocongSkin)" />

          {/* Forehead wrinkles and burial soil */}
          <path d="M 125 128 Q 160 138 195 128" stroke="#1a241c" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M 130 138 Q 160 146 190 138" stroke="#141c15" strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="150" cy="120" r="14" fill="#24140b" opacity="0.75" />

          {/* Sunken Eye Orbits (Rongga Mata Hitam Pekat) */}
          <ellipse cx="132" cy="168" rx="20" ry="24" fill="#030403" stroke="#000" strokeWidth="4" />
          <ellipse cx="188" cy="168" rx="20" ry="24" fill="#030403" stroke="#000" strokeWidth="4" />

          {/* Glowing Crimson Demonic Eyes (Mata Merah Menyala) */}
          <circle cx="132" cy="168" r="8" fill="url(#eyeGlowPocong)" className="animate-ping" style={{ animationDuration: '1.2s' }} />
          <circle cx="132" cy="168" r="5" fill="#ff2222" />
          <circle cx="131" cy="166" r="1.5" fill="#ffffff" />

          <circle cx="188" cy="168" r="8" fill="url(#eyeGlowPocong)" className="animate-ping" style={{ animationDuration: '1.2s' }} />
          <circle cx="188" cy="168" r="5" fill="#ff2222" />
          <circle cx="187" cy="166" r="1.5" fill="#ffffff" />

          {/* Blood Tears (Air Mata Darah Mengucur) */}
          <path d="M 130 188 Q 128 220 126 250 Q 132 235 134 190" fill="url(#bloodDrip)" />
          <path d="M 136 190 Q 139 215 137 235 Q 134 215 136 190" fill="#7a0000" />
          <path d="M 186 188 Q 189 225 192 255 Q 184 235 183 190" fill="url(#bloodDrip)" />
          <path d="M 182 190 Q 180 215 182 230 Q 185 215 182 190" fill="#7a0000" />

          {/* Rotting Sunken Nose Holes */}
          <ellipse cx="155" cy="195" rx="3.5" ry="6" fill="#000000" />
          <ellipse cx="165" cy="195" rx="3.5" ry="6" fill="#000000" />

          {/* Wide Open Rotting Mouth (Mulut Menganga Mengerikan) */}
          <path
            d="M 120 225 Q 160 215 200 225 Q 206 270 160 274 Q 114 270 120 225 Z"
            fill="#050101"
            stroke="#1f0303"
            strokeWidth="4"
          />

          {/* Jagged Broken Teeth (Deretan Gigi Runcing Rusak) */}
          {/* Top Teeth */}
          <polygon points="132,224 136,238 140,224" fill="#dedbb6" stroke="#423a18" strokeWidth="1" />
          <polygon points="143,223 148,241 153,223" fill="#aba565" stroke="#3b330f" strokeWidth="1" />
          <polygon points="156,222 161,242 166,222" fill="#dedbb6" stroke="#423a18" strokeWidth="1" />
          <polygon points="169,223 174,240 179,223" fill="#8f8745" stroke="#2b2507" strokeWidth="1" />
          <polygon points="182,224 186,237 190,224" fill="#dedbb6" stroke="#423a18" strokeWidth="1" />

          {/* Bottom Teeth */}
          <polygon points="135,268 139,252 143,268" fill="#aba565" stroke="#3b330f" strokeWidth="1" />
          <polygon points="147,270 152,249 157,270" fill="#dedbb6" stroke="#423a18" strokeWidth="1" />
          <polygon points="163,270 168,248 173,270" fill="#dedbb6" stroke="#423a18" strokeWidth="1" />
          <polygon points="177,268 181,253 185,268" fill="#8f8745" stroke="#2b2507" strokeWidth="1" />

          {/* Bloody Chin Drip */}
          <path d="M 152 272 Q 155 310 158 325 Q 163 310 165 272" fill="url(#bloodDrip)" />

          {/* Neck Choke Rope Knot (Tali Leher Kafan) */}
          <ellipse cx="160" cy="335" rx="55" ry="16" fill="#4d3723" stroke="#1f150b" strokeWidth="4" />
          <line x1="125" y1="335" x2="195" y2="335" stroke="#261706" strokeWidth="5" />
        </svg>
      )}

      {ghostType === 'KUNTILANAK' && (
        <svg
          viewBox="0 0 320 380"
          className={`w-full h-full filter drop-shadow-[0_0_45px_rgba(6,182,212,0.9)] ${
            isJumpscare ? 'animate-bounce' : ''
          }`}
          style={{ animationDuration: isJumpscare ? '0.12s' : '2s' }}
        >
          <defs>
            <radialGradient id="kuntiSkin" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#e4edf0" />
              <stop offset="45%" stopColor="#b2c4c9" />
              <stop offset="80%" stopColor="#687b80" />
              <stop offset="100%" stopColor="#1e2d30" />
            </radialGradient>
            <radialGradient id="kuntiEye" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#111111" />
              <stop offset="70%" stopColor="#880000" />
              <stop offset="100%" stopColor="#000000" />
            </radialGradient>
            <linearGradient id="kuntiBlood" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ee0000" />
              <stop offset="60%" stopColor="#800000" />
              <stop offset="100%" stopColor="#300000" />
            </linearGradient>
          </defs>

          {/* Wild Black Hair Background Strands */}
          <path d="M 40 50 C 10 160, 20 290, 30 380 L 100 380 C 70 280, 70 160, 80 50 Z" fill="#08080a" />
          <path d="M 280 50 C 310 160, 300 290, 290 380 L 220 380 C 250 280, 250 160, 240 50 Z" fill="#08080a" />
          <path d="M 60 20 C 160 -10, 240 0, 270 30 C 250 120, 270 250, 285 380 L 35 380 C 50 250, 70 120, 60 20 Z" fill="#0d0d12" />

          {/* Pale Female Ghost Head Shape */}
          <path
            d="M 90 120 C 85 70, 120 45, 160 45 C 200 45, 235 70, 230 120 C 228 185, 215 250, 160 285 C 105 250, 92 185, 90 120 Z"
            fill="url(#kuntiSkin)"
            stroke="#1c2729"
            strokeWidth="4"
          />

          {/* Dark Bruised Eye Sockets */}
          <ellipse cx="128" cy="140" rx="24" ry="20" fill="#182224" stroke="#0e1414" strokeWidth="2" />
          <ellipse cx="192" cy="140" rx="24" ry="20" fill="#182224" stroke="#0e1414" strokeWidth="2" />

          {/* Glaring Soul-Void Eyes */}
          <ellipse cx="128" cy="140" rx="15" ry="12" fill="#000000" stroke="#ff2222" strokeWidth="2" />
          <circle cx="128" cy="140" r="4" fill="#ffffff" className="animate-pulse" />

          <ellipse cx="192" cy="140" rx="15" ry="12" fill="#000000" stroke="#ff2222" strokeWidth="2" />
          <circle cx="192" cy="140" r="4" fill="#ffffff" className="animate-pulse" />

          {/* Blood Streaming From Eyes (Air Mata Darah Kuntilanak) */}
          <path d="M 124 150 Q 120 200 115 260 Q 126 210 130 152" fill="url(#kuntiBlood)" />
          <path d="M 132 151 Q 135 185 133 225 Q 129 190 132 151" fill="#750000" />
          <path d="M 188 150 Q 185 195 183 235 Q 192 205 194 152" fill="#750000" />
          <path d="M 196 150 Q 200 200 205 260 Q 194 210 190 152" fill="url(#kuntiBlood)" />

          {/* Pale Nose */}
          <path d="M 160 145 L 157 175 L 163 175 Z" fill="#798d91" opacity="0.6" />
          <ellipse cx="156" cy="177" rx="2" ry="3" fill="#1c2526" />
          <ellipse cx="164" cy="177" rx="2" ry="3" fill="#1c2526" />

          {/* Macabre Widely Stretched Smile (Senyuman Robek Mengerikan) */}
          <path
            d="M 98 200 Q 160 215 222 200 Q 228 250 160 262 Q 92 250 98 200 Z"
            fill="#080202"
            stroke="#400303"
            strokeWidth="4"
          />

          {/* Razor Sharp Needle Teeth */}
          {/* Upper needle teeth */}
          <polygon points="110,202 113,218 116,202" fill="#ffffff" />
          <polygon points="120,204 123,221 126,204" fill="#ffffff" />
          <polygon points="130,206 134,223 138,206" fill="#ffffea" />
          <polygon points="142,207 146,225 150,207" fill="#ffffff" />
          <polygon points="154,208 158,226 162,208" fill="#ffffff" />
          <polygon points="166,208 170,226 174,208" fill="#ffffff" />
          <polygon points="178,207 182,224 186,207" fill="#ffffea" />
          <polygon points="190,205 194,222 198,205" fill="#ffffff" />
          <polygon points="202,203 205,219 208,203" fill="#ffffff" />

          {/* Lower needle teeth */}
          <polygon points="114,242 118,225 122,242" fill="#ffffff" />
          <polygon points="126,246 130,227 134,246" fill="#ffffff" />
          <polygon points="138,250 142,229 146,250" fill="#ffffea" />
          <polygon points="150,252 154,231 158,252" fill="#ffffff" />
          <polygon points="162,252 166,231 170,252" fill="#ffffff" />
          <polygon points="174,250 178,228 182,250" fill="#ffffff" />
          <polygon points="186,246 190,226 194,246" fill="#ffffea" />
          <polygon points="198,242 201,224 204,242" fill="#ffffff" />

          {/* Blood Dripping From Torn Lips */}
          <path d="M 98 200 Q 102 240 100 270 Q 94 235 98 200" fill="url(#kuntiBlood)" />
          <path d="M 222 200 Q 218 240 220 270 Q 226 235 222 200" fill="url(#kuntiBlood)" />
          <path d="M 157 260 Q 160 295 163 325 Q 166 295 163 260" fill="url(#kuntiBlood)" />

          {/* Hanging Wet Hair Strands Over Forehead and Face */}
          <path d="M 100 45 Q 120 110 115 170 Q 105 120 100 45" fill="#040405" />
          <path d="M 140 46 Q 148 105 145 155 Q 138 110 140 46" fill="#040405" />
          <path d="M 175 46 Q 170 115 174 165 Q 182 110 175 46" fill="#040405" />
          <path d="M 215 45 Q 200 120 205 180 Q 218 120 215 45" fill="#040405" />
          <path d="M 160 45 Q 162 90 159 135 Q 156 90 160 45" fill="#040405" />
        </svg>
      )}

      {ghostType === 'GENDERUWO' && (
        <svg
          viewBox="0 0 340 400"
          className={`w-full h-full filter drop-shadow-[0_0_50px_rgba(239,68,68,1)] ${
            isJumpscare ? 'animate-bounce' : ''
          }`}
          style={{ animationDuration: isJumpscare ? '0.12s' : '2s' }}
        >
          <defs>
            <radialGradient id="genderuwoSkin" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#4a150e" />
              <stop offset="40%" stopColor="#2e0a05" />
              <stop offset="80%" stopColor="#140402" />
              <stop offset="100%" stopColor="#050101" />
            </radialGradient>
            <radialGradient id="genderuwoEye" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffff00" />
              <stop offset="35%" stopColor="#ff1100" />
              <stop offset="70%" stopColor="#990000" />
              <stop offset="100%" stopColor="#1a0000" />
            </radialGradient>
            <linearGradient id="tuskGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fff4cc" />
              <stop offset="60%" stopColor="#d9b66c" />
              <stop offset="100%" stopColor="#8a0000" />
            </linearGradient>
          </defs>

          {/* Demonic Horns (Tanduk Iblis Melengkung) */}
          <path
            d="M 95 105 C 75 40, 30 10, 10 35 C 30 70, 75 110, 85 130 Z"
            fill="#120503"
            stroke="#5e1408"
            strokeWidth="4"
          />
          <path
            d="M 245 105 C 265 40, 310 10, 330 35 C 310 70, 265 110, 255 130 Z"
            fill="#120503"
            stroke="#5e1408"
            strokeWidth="4"
          />

          {/* Coarse Beastly Mane / Fur Head Outline */}
          <path
            d="M 60 170 C 40 80, 110 50, 170 50 C 230 50, 300 80, 280 170 C 300 240, 280 340, 170 365 C 60 340, 40 240, 60 170 Z"
            fill="url(#genderuwoSkin)"
            stroke="#0a0201"
            strokeWidth="8"
          />

          {/* Spiky Fur Tufts Along Cheeks */}
          <polygon points="50,160 30,175 58,185" fill="#140402" />
          <polygon points="45,210 20,230 55,235" fill="#140402" />
          <polygon points="50,260 25,280 62,285" fill="#140402" />
          <polygon points="290,160 310,175 282,185" fill="#140402" />
          <polygon points="295,210 320,230 285,235" fill="#140402" />
          <polygon points="290,260 315,280 278,285" fill="#140402" />

          {/* Fierce Beast Brow Ridge */}
          <path
            d="M 85 155 Q 170 170 255 155 Q 230 185 170 185 Q 110 185 85 155 Z"
            fill="#1f0603"
            stroke="#5e1408"
            strokeWidth="3"
          />

          {/* Glowing Blazing Furnace Demonic Eyes (Mata Merah Api Neraka) */}
          <ellipse cx="125" cy="180" rx="22" ry="15" fill="#000000" stroke="#ff2200" strokeWidth="4" />
          <ellipse cx="125" cy="180" rx="16" ry="11" fill="url(#genderuwoEye)" className="animate-pulse" />
          <line x1="125" y1="169" x2="125" y2="191" stroke="#000000" strokeWidth="4" strokeLinecap="round" />

          <ellipse cx="215" cy="180" rx="22" ry="15" fill="#000000" stroke="#ff2200" strokeWidth="4" />
          <ellipse cx="215" cy="180" rx="16" ry="11" fill="url(#genderuwoEye)" className="animate-pulse" />
          <line x1="215" y1="169" x2="215" y2="191" stroke="#000000" strokeWidth="4" strokeLinecap="round" />

          {/* Broad Beast Ape Snout & Nostrils */}
          <ellipse cx="170" cy="225" rx="36" ry="18" fill="#1c0502" stroke="#4a0f07" strokeWidth="3" />
          <ellipse cx="154" cy="227" rx="8" ry="10" fill="#000000" />
          <ellipse cx="186" cy="227" rx="8" ry="10" fill="#000000" />

          {/* Enormous Roaring Beast Jaw (Mulut Mengaum Dahsyat) */}
          <path
            d="M 85 260 Q 170 245 255 260 Q 265 345 170 355 Q 75 345 85 260 Z"
            fill="#030000"
            stroke="#570808"
            strokeWidth="6"
          />

          {/* Giant Lower Boar Tusks (Taring Raksasa Melengkung Berdarah) */}
          <path
            d="M 105 345 Q 92 280 98 230 Q 116 280 125 345 Z"
            fill="url(#tuskGrad)"
            stroke="#380000"
            strokeWidth="3"
          />
          <path
            d="M 235 345 Q 248 280 242 230 Q 224 280 215 345 Z"
            fill="url(#tuskGrad)"
            stroke="#380000"
            strokeWidth="3"
          />

          {/* Upper Predator Fangs */}
          <polygon points="135,260 142,288 150,260" fill="#fcf5cf" stroke="#473a11" strokeWidth="2" />
          <polygon points="152,260 159,286 167,260" fill="#dedbb6" stroke="#473a11" strokeWidth="2" />
          <polygon points="173,260 180,286 188,260" fill="#dedbb6" stroke="#473a11" strokeWidth="2" />
          <polygon points="190,260 197,288 205,260" fill="#fcf5cf" stroke="#473a11" strokeWidth="2" />

          {/* Dripping Blood Gout from Fangs and Chin */}
          <path d="M 98 250 Q 94 305 92 355 Q 102 310 102 260" fill="#b30000" />
          <path d="M 242 250 Q 246 305 248 355 Q 238 310 238 260" fill="#b30000" />
          <path d="M 165 350 Q 170 380 172 398 Q 175 380 175 350" fill="#ff0000" />
        </svg>
      )}
    </div>
  );
};

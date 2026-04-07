'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PLANS = [
  { id:'free',       name:'Free Trial',  price:'₦0',      period:'14 days',  color:'#888',    databases:1, workers:3,  features:['1 Inventory Database','Up to 3 Workers','Basic Analytics','Email Support'] },
  { id:'starter',    name:'Starter',     price:'₦4,999',  period:'/month',   color:'#4488ff', databases:1, workers:5,  features:['1 Inventory Database','Up to 5 Workers','AI Analysis','Real-time Notifications','Priority Support'], popular:false },
  { id:'pro',        name:'Pro',         price:'₦14,999', period:'/month',   color:'#e8ff47', databases:3, workers:20, features:['3 Inventory Databases','Up to 20 Workers','Advanced AI Analysis','Calculator & Reports','Custom Branding','Priority Support'], popular:true },
  { id:'enterprise', name:'Enterprise',  price:'₦49,999', period:'/month',   color:'#44ff88', databases:10,workers:100,features:['10 Inventory Databases','Unlimited Workers','Full AI Suite','API Access','Dedicated Support','SLA Guarantee'] },
];

const FEATURES = [
  { icon:'📦', title:'Multi-Table Inventory', desc:'In Stock, Sold Out, Debtors, Returns and Restock Alerts — all connected and synced in real time.' },
  { icon:'🤖', title:'AI-Powered Analysis', desc:'Google Gemini AI analyzes your inventory daily — spotting trends, flagging low stock, and evaluating worker performance.' },
  { icon:'🔔', title:'Live Notifications', desc:'Admin gets instant real-time alerts the moment any worker updates inventory via WebSocket technology.' },
  { icon:'💳', title:'Smart Debtor Tracking', desc:'Track partial payments, payment history, and automatically update stock when items are taken on credit.' },
  { icon:'🔍', title:'Item Search & Profiles', desc:'Search any product and get a full visual report: stock status, sales history, debtor list, and return records.' },
  { icon:'🧮', title:'Value Calculator', desc:'Calculate total inventory value by day, week, month, year or custom date range with beautiful charts.' },
  { icon:'👥', title:'Multi-Worker Support', desc:'Create worker accounts with role-based access. Workers manage daily records; admins control everything.' },
  { icon:'🗄️', title:'Multiple Databases', desc:'Run multiple inventory systems under one company account — perfect for multiple branches or product lines.' },
];

const TESTIMONIALS = [
  { name:'Adaeze O.', company:'Lagos Wholesale Co.', text:'Zacnos Inventory transformed how we track stock. The AI analysis alone saves us hours every week.', avatar:'A' },
  { name:'Emeka N.', company:'Nnamdi Stores', text:'The debtor tracking feature is a game-changer. We\'ve recovered over ₦2M in outstanding payments.', avatar:'E' },
  { name:'Fatima B.', company:'Kano Distributors Ltd', text:'Running 3 branches from one account is seamless. Our team loves the real-time updates.', avatar:'F' },
];

export default function Landing() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler);
    const t = setInterval(() => setActiveTestimonial(p => (p+1) % TESTIMONIALS.length), 4000);
    return () => { window.removeEventListener('scroll', handler); clearInterval(t); };
  }, []);

  return (
    <div style={{ background:'#080808', color:'#f0f0f0', minHeight:'100vh', fontFamily:"'DM Sans', sans-serif" }}>

      {/* Nav */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, padding:'0 5%',
        background: scrolled ? 'rgba(8,8,8,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid #1a1a1a' : 'none',
        transition:'all 0.3s', display:'flex', alignItems:'center', justifyContent:'space-between', height:64 }}>
        <div style={{ fontFamily:"'Space Mono', monospace", fontSize:16, fontWeight:700, color:'#e8ff47', letterSpacing:'0.05em' }}>
          Zacnos Inventory
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => router.push('/login')}
            style={{ padding:'8px 18px', borderRadius:8, border:'1px solid #333', background:'transparent',
              color:'#aaa', cursor:'pointer', fontSize:13, fontWeight:500 }}>
            Sign In
          </button>
          <button onClick={() => router.push('/signup')}
            style={{ padding:'8px 20px', borderRadius:8, border:'none', background:'#e8ff47',
              color:'#000', cursor:'pointer', fontSize:13, fontWeight:700 }}>
            Get Started Free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', textAlign:'center', padding:'120px 5% 80px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translate(-50%,-50%)',
          width:600, height:600, background:'radial-gradient(circle, rgba(232,255,71,0.08) 0%, transparent 70%)',
          pointerEvents:'none' }} />

        <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 14px',
          background:'rgba(232,255,71,0.1)', border:'1px solid rgba(232,255,71,0.2)',
          borderRadius:20, marginBottom:28, fontSize:12, color:'#e8ff47', fontFamily:"'Space Mono', monospace",
          fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>
          ✦ Built for Nigerian Businesses
        </div>

        <h1 style={{ fontSize:'clamp(36px, 7vw, 80px)', fontWeight:900, lineHeight:1.05,
          fontFamily:"'Space Mono', monospace", letterSpacing:'-0.03em', marginBottom:24, maxWidth:800 }}>
          The Inventory OS<br/>
          <span style={{ color:'#e8ff47' }}>Your Business Deserves</span>
        </h1>

        <p style={{ fontSize:'clamp(15px, 2vw, 20px)', color:'#888', maxWidth:580, lineHeight:1.7, marginBottom:40 }}>
          Multi-table inventory management with AI analysis, real-time notifications, debtor tracking,
          and multi-worker support — all in one powerful platform.
        </p>

        <div style={{ display:'flex', gap:14, flexWrap:'wrap', justifyContent:'center' }}>
          <button onClick={() => router.push('/signup')}
            style={{ padding:'14px 32px', borderRadius:10, border:'none', background:'#e8ff47',
              color:'#000', cursor:'pointer', fontSize:16, fontWeight:800, display:'flex', alignItems:'center', gap:8 }}>
            Start Free Trial
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
          <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior:'smooth' })}
            style={{ padding:'14px 28px', borderRadius:10, border:'1px solid #333', background:'transparent',
              color:'#aaa', cursor:'pointer', fontSize:15, fontWeight:500 }}>
            See Features
          </button>
        </div>

        <p style={{ marginTop:20, fontSize:12, color:'#555', fontFamily:"'Space Mono', monospace" }}>
          No credit card required · 14-day free trial
        </p>

        {/* Mock dashboard preview */}
        <div style={{ marginTop:64, width:'100%', maxWidth:900, background:'#0f0f0f',
          border:'1px solid #222', borderRadius:16, overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.8)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', background:'#111', borderBottom:'1px solid #1a1a1a' }}>
            {['#ff5f57','#ffbd2e','#28c840'].map(c => <div key={c} style={{ width:12, height:12, borderRadius:'50%', background:c }} />)}
            <span style={{ fontSize:11, color:'#444', fontFamily:"'Space Mono', monospace", marginLeft:8 }}>Zacnos Inventory — Pro Dashboard</span>
          </div>
          <div style={{ padding:'20px 24px', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:14 }}>
            {[
              { label:'Total Stock', value:'2,847', color:'#e8ff47' },
              { label:'Units Sold', value:'394', color:'#ff8844' },
              { label:'Revenue', value:'₦1.2M', color:'#44ff88' },
              { label:'Debtors', value:'7', color:'#ff4444' },
              { label:'Low Stock', value:'3', color:'#ff8844' },
            ].map(s => (
              <div key={s.label} style={{ background:'#161616', borderRadius:8, padding:'14px', border:'1px solid #1f1f1f' }}>
                <div style={{ fontFamily:"'Space Mono', monospace", fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:10, color:'#555', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding:'80px 5%' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ fontSize:11, color:'#e8ff47', fontFamily:"'Space Mono', monospace", textTransform:'uppercase',
            letterSpacing:'0.12em', marginBottom:14 }}>Everything You Need</div>
          <h2 style={{ fontSize:'clamp(28px, 5vw, 48px)', fontWeight:900, fontFamily:"'Space Mono', monospace", letterSpacing:'-0.02em' }}>
            Powerful features,<br/><span style={{ color:'#e8ff47' }}>built for growth</span>
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:20, maxWidth:1100, margin:'0 auto' }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ background:'#0f0f0f', border:'1px solid #1a1a1a', borderRadius:12, padding:'24px',
              transition:'all 0.2s', cursor:'default' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='#2a2a2a'; e.currentTarget.style.background='#111'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='#1a1a1a'; e.currentTarget.style.background='#0f0f0f'; }}>
              <div style={{ fontSize:28, marginBottom:14 }}>{f.icon}</div>
              <h3 style={{ fontSize:15, fontWeight:700, color:'#f0f0f0', marginBottom:8, fontFamily:"'Space Mono', monospace" }}>{f.title}</h3>
              <p style={{ fontSize:13, color:'#666', lineHeight:1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding:'80px 5%', background:'#0a0a0a' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ fontSize:11, color:'#e8ff47', fontFamily:"'Space Mono', monospace", textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:14 }}>Simple Pricing</div>
          <h2 style={{ fontSize:'clamp(28px, 5vw, 48px)', fontWeight:900, fontFamily:"'Space Mono', monospace", letterSpacing:'-0.02em' }}>
            Plans for every<br/><span style={{ color:'#e8ff47' }}>business size</span>
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:20, maxWidth:1000, margin:'0 auto' }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{ background: plan.popular ? '#0f120a' : '#0f0f0f',
              border: `2px solid ${plan.popular ? '#e8ff47' : '#1a1a1a'}`,
              borderRadius:14, padding:'28px 24px', position:'relative',
              transform: plan.popular ? 'scale(1.03)' : 'scale(1)', transition:'all 0.2s' }}
              onMouseEnter={e => !plan.popular && (e.currentTarget.style.borderColor='#2a2a2a')}
              onMouseLeave={e => !plan.popular && (e.currentTarget.style.borderColor='#1a1a1a')}>
              {plan.popular && (
                <div style={{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)',
                  background:'#e8ff47', color:'#000', fontSize:10, fontWeight:800, fontFamily:"'Space Mono', monospace",
                  padding:'3px 14px', borderRadius:20, textTransform:'uppercase', letterSpacing:'0.08em', whiteSpace:'nowrap' }}>
                  Most Popular
                </div>
              )}
              <div style={{ fontFamily:"'Space Mono', monospace", fontSize:12, fontWeight:700,
                color: plan.color, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>{plan.name}</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:6 }}>
                <span style={{ fontFamily:"'Space Mono', monospace", fontSize:32, fontWeight:900, color:'#f0f0f0' }}>{plan.price}</span>
                <span style={{ fontSize:13, color:'#555' }}>{plan.period}</span>
              </div>
              <div style={{ fontSize:11, color:'#444', fontFamily:"'Space Mono', monospace", marginBottom:20 }}>
                {plan.databases} DB · {plan.workers === 100 ? 'Unlimited' : plan.workers} Workers
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#888' }}>
                    <span style={{ color:plan.color, flexShrink:0 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <button onClick={() => router.push('/signup')}
                style={{ width:'100%', padding:'11px', borderRadius:8, border: plan.popular ? 'none' : '1px solid #333',
                  background: plan.popular ? '#e8ff47' : 'transparent',
                  color: plan.popular ? '#000' : '#888', cursor:'pointer', fontSize:13,
                  fontWeight: plan.popular ? 800 : 600, transition:'all 0.15s' }}>
                {plan.id === 'free' ? 'Start Free Trial' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding:'80px 5%', textAlign:'center' }}>
        <h2 style={{ fontSize:'clamp(24px, 4vw, 40px)', fontWeight:900, fontFamily:"'Space Mono', monospace",
          letterSpacing:'-0.02em', marginBottom:48 }}>
          Loved by <span style={{ color:'#e8ff47' }}>Nigerian businesses</span>
        </h2>
        <div style={{ maxWidth:560, margin:'0 auto' }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} style={{ display: i === activeTestimonial ? 'block' : 'none',
              background:'#0f0f0f', border:'1px solid #1f1f1f', borderRadius:14, padding:'32px',
              animation:'fadeIn 0.4s ease' }}>
              <p style={{ fontSize:16, color:'#ccc', lineHeight:1.7, marginBottom:24, fontStyle:'italic' }}>
                "{t.text}"
              </p>
              <div style={{ display:'flex', alignItems:'center', gap:12, justifyContent:'center' }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:'#e8ff47',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:800, color:'#000', fontSize:16, fontFamily:"'Space Mono', monospace" }}>{t.avatar}</div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#f0f0f0' }}>{t.name}</div>
                  <div style={{ fontSize:11, color:'#555' }}>{t.company}</div>
                </div>
              </div>
            </div>
          ))}
          <div style={{ display:'flex', gap:6, justifyContent:'center', marginTop:20 }}>
            {TESTIMONIALS.map((_, i) => (
              <button key={i} onClick={() => setActiveTestimonial(i)}
                style={{ width: i===activeTestimonial ? 24 : 8, height:8, borderRadius:4,
                  background: i===activeTestimonial ? '#e8ff47' : '#333',
                  border:'none', cursor:'pointer', transition:'all 0.3s', padding:0 }} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'80px 5%', textAlign:'center', background:'#0a0a0a' }}>
        <div style={{ maxWidth:600, margin:'0 auto' }}>
          <h2 style={{ fontSize:'clamp(28px, 5vw, 52px)', fontWeight:900, fontFamily:"'Space Mono', monospace",
            letterSpacing:'-0.02em', marginBottom:20 }}>
            Ready to take control<br/><span style={{ color:'#e8ff47' }}>of your inventory?</span>
          </h2>
          <p style={{ color:'#666', marginBottom:36, fontSize:15, lineHeight:1.7 }}>
            Join hundreds of Nigerian businesses already using Zacnos Inventory to manage their stock smarter.
          </p>
          <button onClick={() => router.push('/signup')}
            style={{ padding:'16px 40px', borderRadius:10, border:'none', background:'#e8ff47',
              color:'#000', cursor:'pointer', fontSize:16, fontWeight:800 }}>
            Create Your Free Account →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding:'32px 5%', borderTop:'1px solid #111', display:'flex',
        justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
        <div style={{ fontFamily:"'Space Mono', monospace", fontSize:14, fontWeight:700, color:'#e8ff47' }}>Zacnos Inventory</div>
        <div style={{ fontSize:12, color:'#444' }}>© 2025 Zacnos Inventory. All rights reserved.</div>
      </footer>
    </div>
  );
}

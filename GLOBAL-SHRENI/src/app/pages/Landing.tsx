import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import '../../styles/landing.css';

type MarketplaceFilter = 'all' | 'online' | 'local' | 'top-rated';

const listings = [
  { title: 'UI/UX Designer', type: 'online', category: 'Design & Creative', location: 'Remote', rating: 4.9, skills: ['Figma', 'Product design', 'Systems'] },
  { title: 'Electrical Services', type: 'local', category: 'Skilled trade', location: 'Bengaluru', rating: 4.8, skills: ['Installation', 'Repair', 'Safety'] },
  { title: 'AI Automation Consultant', type: 'online', category: 'Consulting', location: 'Remote', rating: 5, skills: ['Automation', 'Strategy', 'Workflows'] },
  { title: 'Home Renovation Team', type: 'local', category: 'Field service', location: 'Pune', rating: 4.9, skills: ['Carpentry', 'Painting', 'Planning'] },
  { title: 'Full-stack Developer', type: 'online', category: 'Technology', location: 'Remote', rating: 4.7, skills: ['React', 'Node.js', 'APIs'] },
  { title: 'Event Photography', type: 'local', category: 'Creative service', location: 'Mumbai', rating: 4.8, skills: ['Events', 'Editing', 'Delivery'] },
];

const filters: Array<{ id: MarketplaceFilter; label: string }> = [
  { id: 'all', label: 'All listings' },
  { id: 'online', label: 'Digital talent' },
  { id: 'local', label: 'Local services' },
  { id: 'top-rated', label: 'Top rated' },
];

export function Landing() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MarketplaceFilter>('all');

  const results = useMemo(() => {
    const search = query.trim().toLowerCase();
    return listings.filter((listing) => {
      const matchesFilter = filter === 'all'
        || listing.type === filter
        || (filter === 'top-rated' && listing.rating >= 4.9);
      const searchable = [listing.title, listing.category, listing.location, ...listing.skills].join(' ').toLowerCase();
      return matchesFilter && (!search || searchable.includes(search));
    });
  }, [filter, query]);

  const showMarketplace = () => {
    document.getElementById('marketplace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectFilter = (nextFilter: MarketplaceFilter) => {
    setFilter(nextFilter);
    window.setTimeout(showMarketplace, 0);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    showMarketplace();
  };

  return (
    <main className="gs-landing">
      <div className="gs-noise" aria-hidden="true" />
      <nav className="gs-nav" aria-label="Main navigation">
        <button className="gs-brand" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="gs-brand-mark">GS</span>
          <span>GLOBAL SHRENI</span>
        </button>
        <div className="gs-nav-links">
          <a href="#ecosystem">Ecosystem</a>
          <a href="#marketplace">Marketplace</a>
          <a href="#trust">Trust</a>
        </div>
        <button className="gs-nav-cta" type="button" onClick={() => navigate('/role-selection')}>Join the marketplace <ArrowRight size={15} /></button>
      </nav>

      <section className="gs-hero">
        <div className="gs-hero-glow" aria-hidden="true" />
        <div className="gs-eyebrow"><span /> THE GLOBAL TALENT &amp; SERVICES MARKETPLACE</div>
        <h1>Connecting skills.<br /><em>Creating opportunity.</em></h1>
        <p className="gs-hero-copy">One trusted marketplace for people who create, hire, deliver and build—across online, local and hybrid work.</p>
        <form className="gs-search" onSubmit={handleSearch}>
          <Search size={19} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a skill, service, professional, or local expert" aria-label="Search the marketplace" />
          <button type="submit">Search <ArrowRight size={16} /></button>
        </form>
        <div className="gs-hero-actions">
          <button className="gs-primary-button" type="button" onClick={() => selectFilter('online')}>Find talent <ArrowRight size={16} /></button>
          <button className="gs-secondary-button" type="button" onClick={() => selectFilter('local')}>Find local services</button>
        </div>
        <div className="gs-proof-row"><span><Sparkles size={14} /> Intelligent matching</span><span><ShieldCheck size={14} /> Structured engagements</span><span><CheckCircle2 size={14} /> Trusted reputation</span></div>
      </section>

      <section id="ecosystem" className="gs-section gs-ecosystem">
        <div className="gs-section-heading">
          <span className="gs-kicker">ONE CONNECTED ECONOMY</span>
          <h2>Online + offline.<br /><span>One place to find the right help.</span></h2>
        </div>
        <div className="gs-bento-grid">
          <article className="gs-bento gs-bento-wide">
            <span className="gs-card-label">ONLINE</span>
            <BriefcaseBusiness size={28} />
            <h3>Digital talent without borders.</h3>
            <p>Find freelancers, consultants, creators, designers and specialists for remote or distributed work.</p>
            <div className="gs-tags"><span>Full-stack</span><span>UI/UX design</span><span>Consulting</span></div>
          </article>
          <article className="gs-bento gs-bento-gold">
            <span className="gs-card-label">INTELLIGENCE</span>
            <Sparkles size={28} />
            <h3>Describe the work. Find the match.</h3>
            <p>Search by requirement, capability, experience and location—without navigating a maze of categories.</p>
            <button type="button" onClick={() => navigate('/customer')}>Open the workspace <ArrowRight size={16} /></button>
          </article>
          <article className="gs-bento gs-bento-full">
            <div><span className="gs-card-label">LOCAL</span><MapPin size={28} /><h3>Local skills deserve digital access.</h3><p>Discover technicians, artisans, tradespeople and service professionals in the communities where work happens.</p></div>
            <div className="gs-service-grid"><span>Electrical</span><span>Home repair</span><span>Events</span><span>Education</span><span>Craft</span><span>Agriculture</span></div>
          </article>
        </div>
      </section>

      <section id="marketplace" className="gs-section gs-marketplace">
        <div className="gs-marketplace-head">
          <div><span className="gs-kicker">MARKETPLACE PREVIEW</span><h2>Discover people and services.</h2><p>Explore the current product direction with curated listings.</p></div>
          <div className="gs-filter-list" aria-label="Filter marketplace listings">
            {filters.map((item) => <button key={item.id} type="button" className={filter === item.id ? 'active' : ''} onClick={() => setFilter(item.id)} aria-pressed={filter === item.id}>{item.label}</button>)}
          </div>
        </div>
        <div className="gs-listing-grid">
          {results.map((listing) => <article key={listing.title} className="gs-listing-card">
            <div className="gs-listing-top"><div className="gs-listing-avatar">{listing.title.split(' ').map((word) => word[0]).join('').slice(0, 2)}</div><div><h3>{listing.title}</h3><p>{listing.location} · {listing.category}</p></div><span className="gs-online-dot" title="Available" /></div>
            <div className="gs-listing-skills">{listing.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
            <div className="gs-listing-footer"><span>{listing.type === 'online' ? 'Remote-ready' : 'Local availability'}</span><strong><Star size={13} fill="currentColor" /> {listing.rating.toFixed(1)}</strong></div>
          </article>)}
        </div>
        {!results.length && <p className="gs-empty">No listing matches that search. Try a broader skill or service.</p>}
      </section>

      <section id="trust" className="gs-section gs-trust">
        <div><span className="gs-kicker">BUILT FOR REAL WORK</span><h2>More signal. Less friction.</h2><p>Global Shreni gives customers, talent and service partners a shared foundation for finding work, earning trust and getting things done.</p></div>
        <div className="gs-trust-points"><article><ShieldCheck size={22} /><h3>Trust that compounds</h3><p>Profiles, ratings and completed engagements make good work easier to recognize.</p></article><article><Users size={22} /><h3>Designed for both sides</h3><p>Hire, deliver, manage availability and build a stronger professional identity.</p></article><article><Sparkles size={22} /><h3>Ready for intelligent matching</h3><p>The platform’s API layer is prepared for an AI matching experience when credentials are enabled.</p></article></div>
      </section>

      <section className="gs-final-cta"><span className="gs-kicker">START BUILDING MOMENTUM</span><h2>Bring your work to a marketplace built for progress.</h2><button className="gs-primary-button" type="button" onClick={() => navigate('/role-selection')}>Create your profile <ArrowRight size={16} /></button></section>
      <footer className="gs-footer"><div className="gs-brand"><span className="gs-brand-mark">GS</span><span>GLOBAL SHRENI</span></div><span>Creation · Stability · Prosperity</span><a href="mailto:globalshreni@gmail.com">globalshreni@gmail.com</a></footer>
    </main>
  );
}

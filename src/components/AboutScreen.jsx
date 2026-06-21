const BMAC_URL = "https://buymeacoffee.com/thetransfergame";

const sections = [
  {
    q: "Where did this come from?",
    a: `The Transfer Wheel is based on a game my brother and I used to play as kids, on holiday. We were football and Championship Manager obsessed, but we never had access to Champ Manager while actually away, so we made up our own version with a pen and paper.

The rules were simple. We'd write down the made-up transfer values of the best players in the world on one piece of paper, then write a load of random amounts of money, £5m, £25m, £50m, on little scraps, fold them up, and chuck them in a hat. Then we'd take it in turns pulling a value out of the hat and using it to buy a player, position by position, until we each had a full starting XI of world superstars. Any money you didn't spend on your go carried over into the next round, which was usually the only bit of strategy involved.

The ending was always a bit of an anti-climax, mind. We had no way of actually making the teams play each other, so we'd drag our dad over and make him decide whose team was better.`,
  },
  {
    q: "Wait, so where does the name come from?",
    a: `Back then we just called it "the transfer game." For a while, once I started building the app, I had it down as "The Football Director," since that felt like the closest real-world job to what you're actually doing in the game. Turns out there's already a small football management game out there with that exact name, so I went looking for something else.

The wheel was always the heart of the game, even back in the pen-and-paper days when it was a hat full of folded-up scraps of paper. Every transfer comes down to a spin, and the chaos of that spin is half the fun, so The Transfer Wheel felt like the honest name for it. It's also just a better description of what you're doing for most of the game: spinning, drafting, hoping for a big number.`,
  },
  {
    q: "Twenty-five years later, what brought it back?",
    a: `We still go on the same family holiday every year, in Torrevieja, Spain. My nan and grandad bought a villa out there decades ago, and it's still in the family. A couple of years ago, our nephew, who's roughly the age my brother and I were when we invented the game, came on holiday with us, and we introduced him to it.

Except this time we had smartphones, data roaming, Transfermarkt, and a random wheel-spinner app, so we played a modernised version of the same game. He loved it exactly as much as we did, so much that we ended up playing 8-player versions most nights, and even squeezing in a "quick" 5-a-side dream team version before dinner.`,
  },
  {
    q: "So how did it go from a holiday game to an actual app?",
    a: `After playing 38-0, one of those brilliant little browser football games, I had the idea that this could be its own proper game, contained in one place instead of split across a hat, a phone, and three different websites.

The only problem: I have no coding knowledge whatsoever. None. But thanks to Claude Code, I've been able to build this far quicker than I ever thought was realistic for someone starting from zero. The original goal was simply to have a decent enough version ready to play on the 2026 family holiday, and everything since has been a bonus.`,
  },
  {
    q: "What's it actually like, building a game with no coding background?",
    a: `Genuinely fun, and a bit surreal. I do everything by talking to Claude Code in plain English — I haven't even looked at the code itself. I set up the GitHub, Vercel, and Firebase accounts myself, but beyond that it's felt a lot like being a product manager giving instructions to an engineering team, rather than "coding" in any way I'd recognise.

The maddest part for me has been getting online multiplayer working. I never expected to get there, but I did, and the first time my brother and I played a full game against each other from our own homes in Manchester, that felt like a genuine milestone.`,
  },
  {
    q: "What's the game actually like to play?",
    a: `You start by setting up your club: name, colours, formation. Then there's a spin on the Managerial Merry-Go-Round, where you're shown three managers and pick one to lead your side.

Then the draft begins. You take it in turns spinning a wheel for a transfer budget, position by position. One spin might hand you £100m for a centre-back, the next might land on zero, leaving you nothing for your striker. It's pure luck on the budget side, but what you do with it is all you. Any money you don't spend on your turn carries over to the next round, so there's a constant tension between banking it and just taking the best player available.

Once every squad is drafted, the teams face off to settle whose spins, and whose squad-building, actually came out on top.`,
  },
  {
    q: "Is there a story behind the people who play it?",
    a: `Mostly, yes. It's me, my brother, and now our nephew, plus whichever friends and family we can rope in on a given night. It's designed for up to 8 players and works best as a social, slightly chaotic group game rather than something you'd sit and play alone. My dad was the original "match engine," and still takes his role of deciding the winner very seriously to this day. The match engine's come a long way since then, but I think he'd still want final say if we let him.`,
  },
  {
    q: "Who's it actually for?",
    a: `The Transfer Wheel is a daft little game for people whose favourite part of Football Manager was always the transfer window, but who don't have anywhere near the time to play it like they used to. Best enjoyed with your mates.`,
  },
  {
    q: "What's next?",
    a: `I'm constantly tinkering, new leagues, new eras, new ways to play, but the core of it stays the same as that pen-and-paper game from 25 years ago. If you've enjoyed playing and want to support where this goes next, there's a link below.`,
  },
];

export default function AboutScreen({ onBack }) {
  return (
    <div className="setup-screen">
      <div className="about-card">
        <div className="about-header">
          <button className="about-back-btn" onClick={onBack}>← BACK</button>
          <h1 className="setup-title about-title">The Transfer Wheel</h1>
          <p className="setup-sub">A few questions about what this game is, and how it ended up on your phone.</p>
        </div>

        <div className="about-sections">
          {sections.map(({ q, a }) => (
            <div key={q} className="about-section">
              <h2 className="about-q">{q}</h2>
              {a.split("\n\n").map((para, i) => (
                <p key={i} className="about-p">{para}</p>
              ))}
            </div>
          ))}
        </div>

        <div className="about-support">
          <p className="about-support-label">Enjoyed it? Help keep the lights on.</p>
          <a
            className="about-bmac-btn"
            href={BMAC_URL}
            target="_blank"
            rel="noreferrer"
          >
            ☕ BUY ME A COFFEE
          </a>
        </div>
      </div>
    </div>
  );
}

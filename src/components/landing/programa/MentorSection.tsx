import rodrigoImg from "@/assets/rodrigo-nascimento-sm.jpg";
import carlosImg from "@/assets/carlos-soares-sm.png";

const founders = [
  {
    name: "Rodrigo Nascimento",
    role: "CO-FUNDADOR DA <DN.IA>",
    image: rodrigoImg,
    bio: "Estrategista em inteligência artificial aplicada a negócios. Atuou como CMO da Sólides e Obabox e Head de Marketing da Rock Content na América do Norte, liderando estratégia e geração de demanda, performance e crescimento.",
    linkedin: null,
  },
  {
    name: "Carlos Soares",
    role: "CO-FUNDADOR DA <DN.IA>",
    image: carlosImg,
    bio: "Empreendedor e executivo com mais de 25 anos de experiência na criação e escala de negócios. Foi VP de Marketing e Vendas do Grupo Multi, responsável por receita e estratégia, liderando um time de centenas de pessoas.",
    linkedin: null,
  },
];

export function MentorSection() {
  return (
    <section className="section-padding section-bg-elevated diagonal-pattern">
      <div className="section-container">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            Os{" "}
            <span className="text-gradient-dnia">&lt;Fundadores&gt;</span>
          </h2>
        </div>

        {/* Founders Grid */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
          {founders.map((founder) => (
            <div
              key={founder.name}
              className="glass-card p-5 md:p-6 text-center flex flex-col items-center"
            >
              {/* Photo */}
              <img
                src={founder.image}
                alt={founder.name}
                loading="lazy"
                width={160}
                height={160}
                className="w-32 h-32 md:w-40 md:h-40 object-cover object-top rounded-full mb-5 border border-border/30"
              />

              {/* Info */}
              <h3 className="text-lg md:text-xl font-bold mb-1">{founder.name}</h3>
              <p className="text-xs font-mono tracking-wider text-primary mb-4">
                {founder.role}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {founder.bio}
              </p>

              {/* LinkedIn */}
              {founder.linkedin && (
                <a
                  href={founder.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

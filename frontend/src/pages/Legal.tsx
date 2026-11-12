import { Link } from 'react-router-dom';

// Fill these in before publishing, then have a lawyer review the texts.
const RESPONSAVEL = 'Operador do finance+'; // put the legal name and CPF/CNPJ here
const CONTATO = 'joaodan.lisboa@gmail.com';
const FORO = 'Brasil'; // city/state of the court

const TERMOS = [
  ['O que é', 'O finance+ é um aplicativo de controle financeiro pessoal e de casal. Ele organiza lançamentos, contas, metas e orçamento; não é consultoria financeira, de investimento, contábil ou jurídica.'],
  ['Sua conta', 'Você precisa informar um e-mail seu e confirmá-lo. Guarde a senha e o PIN: tudo o que for feito na conta é de sua responsabilidade. Você deve ter 18 anos ou mais.'],
  ['Uso permitido', 'Use o app só para fins lícitos. Não tente acessar dados de outras pessoas, sobrecarregar o serviço ou burlar limites.'],
  ['Assistente de IA', 'O assistente usa modelos de terceiros e pode errar. Confira sempre os valores antes de confirmar qualquer ação sugerida. O uso com a chave da plataforma tem limite diário de mensagens.'],
  ['Disponibilidade', 'Fazemos o possível para manter o serviço no ar e com backup, mas ele é oferecido “como está”, sem garantia de funcionamento ininterrupto ou livre de erros.'],
  ['Responsabilidade', 'Na extensão permitida pela lei, não respondemos por decisões financeiras tomadas com base no app nem por perdas indiretas.'],
  ['Encerramento', 'Você pode apagar sua conta e exportar seus dados a qualquer momento em Perfil. Podemos suspender contas que violem estes termos.'],
  ['Mudanças e foro', `Podemos atualizar estes termos; mudanças relevantes serão avisadas no app. Foro: ${FORO}.`],
];

const PRIVACIDADE = [
  ['Quem é o responsável', `${RESPONSAVEL}. Contato do encarregado de dados (LGPD): ${CONTATO}.`],
  ['O que coletamos', 'Nome, e-mail, senha (guardada apenas como hash), PIN (hash), salário e preferências informadas, contas, lançamentos, metas, parcelamentos e anotações que você cadastra, além de registros técnicos de acesso (IP, horário e erros) para segurança e funcionamento.'],
  ['Para quê', 'Para prestar o serviço: calcular saldos e orçamento, enviar códigos por e-mail, vincular o casal e responder ao assistente. Não vendemos seus dados nem exibimos anúncios.'],
  ['Com quem compartilhamos', 'Provedores necessários à operação: hospedagem do servidor e do banco de dados, envio de e-mail e, se você usar o assistente, o provedor de IA (a conversa e um resumo dos seus dados financeiros são enviados a ele) e o Telegram, se você conectar o bot. Seu parceiro vinculado vê apenas o que é compartilhado entre vocês.'],
  ['Chave de IA própria', 'Se você informar uma chave de API, ela é guardada criptografada e usada somente para falar com o provedor que você escolheu.'],
  ['Seus direitos', `Acesso, correção, portabilidade, eliminação e revogação do consentimento. Exporte e apague seus dados em Perfil, ou escreva para ${CONTATO}.`],
  ['Retenção e segurança', 'Mantemos os dados enquanto a conta existir; ao apagar a conta eles são removidos (cópias de backup expiram em até 14 dias). Usamos conexão criptografada, senhas com hash e limites contra tentativas abusivas.'],
];

export default function Legal({ kind }: { kind: 'termos' | 'privacidade' }) {
  const items = kind === 'termos' ? TERMOS : PRIVACIDADE;
  return (
    <main className="min-h-[100dvh] bg-ink px-4 py-10 text-text">
      <article className="mx-auto max-w-2xl space-y-5 text-[14px] leading-relaxed">
        <Link to="/" className="text-[13px] text-brand hover:underline">← Voltar</Link>
        <h1 className="text-2xl font-semibold">{kind === 'termos' ? 'Termos de Uso' : 'Política de Privacidade'}</h1>
        {items.map(([title, text]) => (
          <section key={title}>
            <h2 className="font-medium">{title}</h2>
            <p className="text-text-mute">{text}</p>
          </section>
        ))}
        <p className="text-[12px] text-text-mute">Última atualização: novembro de 2026.</p>
      </article>
    </main>
  );
}

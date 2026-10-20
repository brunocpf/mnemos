# Ficha da loja: português (pt-BR)

Texto-rascunho para as fichas do Google Play (via PWABuilder / Trusted Web Activity), Microsoft Store e Apple App Store. Os limites de caracteres são os atuais das lojas; confira de novo no momento do envio. Itens entre `[colchetes]` devem ser preenchidos ou confirmados pelo responsável.

As afirmações foram conferidas com o código em 20/10/2026. O "Pergunte ao Mnemos" (chat sobre as suas notas) **não** está implementado e por isso não é citado.

## Nome do app

**Mnemos** (limites: Play 30, Microsoft 256, Apple 30)

Opções de subtítulo (limite da Apple: 30):

- Notas privadas, busca inteligente (33, longo demais para a Apple; serve para Play/Microsoft)
- Notas privadas e busca esperta (30)

## Descrição curta (Google Play, máx. 80)

> Notas privadas com busca inteligente no dispositivo e resumos opcionais. (72)

Alternativas:

- Notas que ficam no seu dispositivo, com busca por significado. (62)
- Notas offline. Encontre ideias pelo sentido, não só por palavras. (65)

## Resumo (Microsoft Store, máx. 100)

> App de notas privado e offline. Busque pelo sentido e resuma no seu dispositivo. (80)

## Descrição completa (Google Play máx. 4000, Microsoft máx. 10000, Apple máx. 4000)

```text
O Mnemos é um caderno privado que ajuda você a encontrar o que escreveu pelo sentido, e não apenas pelas palavras exatas de que se lembra.

Suas notas ficam no seu dispositivo. Não há conta, serviço de sincronização nem análise de uso. A busca inteligente e os resumos também rodam no seu dispositivo, então continuam funcionando no avião, no metrô ou onde o sinal cair.

ESCREVA
• Um editor limpo com títulos, negrito, itálico, sublinhado, listas, citações, código, links e imagens (por URL)
• Renomeie notas e apague com Desfazer
• Funciona totalmente offline depois de carregado

ENCONTRE IDEIAS PELO SENTIDO
• Digite o que você lembra ("aquela ideia dos cartões de fidelidade da padaria") e o Mnemos mostra a nota certa, mesmo que você nunca tenha usado essas palavras
• Funciona em português e em inglês, inclusive buscando em um idioma e encontrando notas no outro
• Os trechos encontrados ficam destacados para você ver por que a nota apareceu
• A indexação acontece no seu dispositivo e só reprocessa as notas que você alterou

RESUMA COM UM TOQUE
• Toque em Resumir numa nota longa para receber um resumo curto em tópicos, no idioma da própria nota
• Roda no seu dispositivo por padrão
• Em Configurações você escolhe onde os resumos rodam: só no seu dispositivo, no dispositivo com apoio da nuvem, ou só na nuvem

PRIVACIDADE QUE VOCÊ PODE CONFERIR
• As notas ficam no banco de dados local do seu navegador, não em nossos servidores
• Se você permitir o apoio da nuvem, apenas o texto necessário para aquele resumo ou aquela busca é enviado para processamento, e o Mnemos não o armazena. "Somente no seu dispositivo" não envia nada
• Cada resumo informa se foi feito no seu dispositivo ou na nuvem
• Código aberto sob a licença MIT

DOWNLOADS ÚNICOS
Na primeira vez que você usa a busca e os resumos, o Mnemos baixa seus modelos de IA para o dispositivo (cerca de 120 MB para a busca e cerca de 570 MB para os resumos). Os downloads são retomados se forem interrompidos. Depois disso, funcionam offline. Recomendamos usar Wi-Fi.

DISPONÍVEL EM
Português do Brasil e inglês, com aparência clara e escura que acompanha o seu dispositivo.

O Mnemos está em versão inicial. Pastas, importação/exportação e perguntas em formato de chat sobre as suas notas estão no roteiro, mas ainda não estão disponíveis.
```

(Cerca de 2.200 caracteres.)

## Palavras-chave

Campo de palavras-chave da App Store (máx. 100 caracteres, separadas por vírgula, sem espaços):

```text
notas,anotações,caderno,offline,privado,busca semântica,segundo cérebro,markdown,resumo,ia,diário
```

Google Play / Microsoft Store (sem campo de palavras-chave na Play; use no texto de forma natural):

- app de notas privado, anotações offline, busca por significado, busca semântica, IA no dispositivo, segundo cérebro, gestão de conhecimento pessoal, notas em markdown, resumo de notas
- Microsoft Store permite até 7 termos de busca de 30 caracteres: `notas privadas`, `anotações offline`, `busca semântica`, `segundo cérebro`, `resumo de notas`, `local-first`, `IA no dispositivo`

## Categorias

- Google Play: Produtividade
- Microsoft Store: Produtividade
- Apple App Store: Produtividade (secundária: Utilitários)

## Novidades (notas da versão)

Primeira versão (`0.1.0`), máx. 500 caracteres no Play e 4000 na Apple/Microsoft:

```text
Primeira versão do Mnemos.
• Notas privadas guardadas no seu dispositivo
• Busca pelo sentido em português e inglês, offline
• Resumos com um toque, no seu dispositivo por padrão
• Apagar com Desfazer, aparência clara e escura, interface em português e inglês
• Instalável e funciona offline
```

Nas próximas versões, reaproveite a entrada correspondente do [CHANGELOG.md](../../CHANGELOG.md), reescrita para o público.

## Respostas de privacidade e segurança de dados

Use nos formulários das lojas, mantendo coerência com a [política de privacidade](../../src/app/[locale]/privacy-policy/page.tsx) do app.

- **URL da política de privacidade:** `[https://<domínio-de-produção>/pt-BR/privacy-policy]` (a versão em inglês fica em `/privacy-policy`). A página precisa estar pública, sem login.
- **Dados coletados pelo desenvolvedor:** nenhum por padrão. Não há contas, análise de uso, anúncios nem SDKs de terceiros.
- **Dados enviados para fora do dispositivo:** somente se o usuário mantiver a configuração padrão de resumos e o modelo no dispositivo não puder rodar (por exemplo, o download não terminou), escolher "Somente nuvem" ou ativar o apoio da nuvem para embeddings. Nesses casos o texto da nota ou a consulta de busca é enviado ao servidor do app e daí ao Hugging Face, só para gerar o resultado, e não é armazenado pelo Mnemos. No formulário de segurança de dados do Play, declarar "Conteúdo do usuário" (texto das notas) como compartilhado para a funcionalidade do app, opcional, processado de forma efêmera, criptografado em trânsito; o usuário evita o envio com "Somente no seu dispositivo".
- **Exclusão de dados:** todos os dados são locais; apagar as notas no app, limpar os dados do site ou desinstalar remove tudo.
- **Classificação indicativa:** adequado para todos; a política informa que não é destinado a menores de 13 anos `[confirmar respostas do questionário em cada loja]`.
- **Permissões:** nenhuma além de um web app comum (sem câmera, localização, contatos ou microfone).

## Links de suporte e divulgação

- Suporte: https://github.com/brunocpf/mnemos/issues
- Código-fonte: https://github.com/brunocpf/mnemos
- Site: `[URL de produção]`
- E-mail de contato: `[a definir pelo responsável]`

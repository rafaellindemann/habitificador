# gamificador / habit tracker

Já temos uma primeira versão de protótipo de interface...

## no radar:
modo mês (grid 7x5/6),


filtros (mostrar só metas, só aulas, etc),

e um “resumo do período” (sem precisar virar gráfico).




- O id da tarefa não seria melhor meter um número com Date.now() e não deixar o user editar? 
- Na criação ou edição, não deixar a meta semanal ser maior que 7, a mensal e anual ser maior que o número de dias? 
- Uma opção para cadastrar cores para usar com as tarefas, com nome e #hex? 
- Se o salvamento for feito em um único registro do local storage não fica mais fácil migrar para algum serviço de persistência externa depois? Tô pensando em usar um firebase ou supabase no futuro 
- Seria legal que a tarefa tivesse uma prop categoria (ex estudo, fit, trabalho...) 
- Os options dos selects estão com letra branca em fundo branco, só aparece o texto no hover. Resolve aí? Remova o botão "Limpar checks", ele não faz sentido.
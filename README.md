# Teste local

Serve os sites de contrato e de OS no seu computador, para testar antes de publicar no Netlify.

```
node teste-local/servidor.mjs
```

Depois abra:
- Contrato: http://localhost:8000/contrato/
- OS: http://localhost:8000/os/
- Registros enviados nos testes: http://localhost:8000/api/registros

Como funciona:
- Os arquivos são lidos direto de `lziphonescontrato/` e `lziphonesos/`. Nada é copiado.
- Os endereços de produção (`lz-registros.netlify.app` e `api/os/numero`) são trocados só na resposta ao navegador, então nada chega ao Netlify.
- O contador da OS começa em 7 e os registros ficam só na memória. Quando o servidor para, tudo some.
- Para parar: Ctrl+C no terminal onde ele está rodando.

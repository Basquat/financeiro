package com.financeiro.casal.service;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.junit.jupiter.api.Assertions.*;

/** Document reading for the assistant: DOCX text and picking the relevant part of a long document. */
class AssistantDocsTest {

    @Test
    void readsDocxParagraphs() throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
            zip.putNextEntry(new ZipEntry("word/document.xml"));
            zip.write("<w:document><w:body><w:p><w:r><w:t>Aluguel R$ 1.500</w:t></w:r></w:p><w:p><w:r><w:t>Luz &amp; água</w:t></w:r></w:p></w:body></w:document>"
                    .getBytes(StandardCharsets.UTF_8));
        }
        assertEquals("Aluguel R$ 1.500\nLuz & água", AssistantService.officeText(bytes.toByteArray()));
    }

    @Test
    void keepsTheChunksThatMatchTheQuestion() {
        String filler = "linha sem importancia nenhuma aqui\n".repeat(200);
        String doc = "CABEÇALHO DO CONTRATO\n" + filler + "Cláusula de multa por rescisão: 3 aluguéis\n" + filler;
        String out = AssistantService.relevant(doc, "qual a multa de rescisao?", 3000);
        assertTrue(out.length() <= 3200, "respects the budget");
        assertTrue(out.contains("CABEÇALHO"), "keeps the first chunk");
        assertTrue(out.contains("multa por rescisão"), "keeps the matching chunk");
        assertEquals(doc, AssistantService.relevant(doc, "x", doc.length()), "short docs pass through");
    }
}

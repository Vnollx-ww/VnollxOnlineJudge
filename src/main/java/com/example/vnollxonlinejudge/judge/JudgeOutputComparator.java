package com.example.vnollxonlinejudge.judge;

public final class JudgeOutputComparator {
    private JudgeOutputComparator() {
    }

    public static boolean equalsIgnoringWhitespace(String expectedOutput, String actualOutput) {
        return normalizeWhitespace(expectedOutput).equals(normalizeWhitespace(actualOutput));
    }

    public static String normalizeLineEndings(String output) {
        if (output == null) {
            return "";
        }
        return output.replace("\r\n", "\n").replace("\r", "\n");
    }

    private static String normalizeWhitespace(String output) {
        String normalized = normalizeLineEndings(output).trim();
        if (normalized.isEmpty()) {
            return "";
        }
        return String.join(" ", normalized.split("\\s+"));
    }
}

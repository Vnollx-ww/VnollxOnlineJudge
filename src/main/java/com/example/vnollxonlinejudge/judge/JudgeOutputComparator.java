package com.example.vnollxonlinejudge.judge;

public final class JudgeOutputComparator {
    private JudgeOutputComparator() {
    }

    public static boolean equalsIgnoringWhitespace(String expectedOutput, String actualOutput) {
        return normalizeWhitespace(expectedOutput).equals(normalizeWhitespace(actualOutput));
    }

    public static boolean equalsWithFloatTolerance(String expectedOutput, String actualOutput, double tolerance) {
        String[] expectedTokens = tokens(expectedOutput);
        String[] actualTokens = tokens(actualOutput);
        if (expectedTokens.length != actualTokens.length) {
            return false;
        }
        for (int i = 0; i < expectedTokens.length; i++) {
            Double expectedNumber = parseFiniteDouble(expectedTokens[i]);
            if (expectedNumber == null) {
                if (!expectedTokens[i].equals(actualTokens[i])) {
                    return false;
                }
                continue;
            }
            Double actualNumber = parseFiniteDouble(actualTokens[i]);
            if (actualNumber == null) {
                return false;
            }
            double diff = Math.abs(actualNumber - expectedNumber);
            if (diff > tolerance && diff > tolerance * Math.abs(expectedNumber)) {
                return false;
            }
        }
        return true;
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

    private static String[] tokens(String output) {
        String normalized = normalizeLineEndings(output).trim();
        if (normalized.isEmpty()) {
            return new String[0];
        }
        return normalized.split("\\s+");
    }

    private static Double parseFiniteDouble(String token) {
        try {
            double value = Double.parseDouble(token);
            return Double.isFinite(value) ? value : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }
}

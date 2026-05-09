package com.dermind.DerMind.product.service;

import org.springframework.stereotype.Component;
import java.util.Set;

@Component
public class IngredientSafetyChecker {

  private static final Set<String> RISKY = Set.of(
      "formaldehyde", "formalin", "methylene glycol",
      "chloroform", "benzidine", "chloramphenicol",
      "lead acetate", "mercury", "mercuric", "thimerosal",
      "beryllium", "arsenic", "asbestos", "carbon black",
      "coal tar", "hexachlorophene", "zirconium chlorohydrate",
      "bithionol", "methanol");

  private static final Set<String> CAUTION = Set.of(
      "sodium lauryl sulfate", "sodium laureth sulfate",
      "fragrance", "parfum",
      "methylparaben", "ethylparaben", "propylparaben",
      "butylparaben", "isobutylparaben", "benzylparaben",
      "methylisothiazolinone", "methylchloroisothiazolinone",
      "phenoxyethanol", "triclosan", "triclocarban",
      "alcohol denat", "sd alcohol",
      "benzophenone", "oxybenzone",
      "hydroquinone", "resorcinol",
      "hydrogen peroxide",
      "bha", "bht", "butylated hydroxyanisole", "butylated hydroxytoluene",
      "imidazolidinyl urea", "diazolidinyl urea", "dmdm hydantoin", "quaternium-15",
      "phthalate", "synthetic fragrance",
      "ammonium persulfate", "p-phenylenediamine");

  public record IngredientCounts(int safeCount, int cautionCount, int riskyCount) {
  }

  public IngredientCounts analyze(String ingredientsText) {
    if (ingredientsText == null || ingredientsText.isBlank()) {
      return new IngredientCounts(0, 0, 0);
    }

    String[] parts = ingredientsText.split(",");
    int safe = 0, caution = 0, risky = 0;

    for (String part : parts) {
      String ingredient = part.trim().toLowerCase();
      if (ingredient.isEmpty())
        continue;

      if (RISKY.stream().anyMatch(ingredient::contains)) {
        risky++;
      } else if (CAUTION.stream().anyMatch(ingredient::contains)) {
        caution++;
      } else {
        safe++;
      }
    }

    return new IngredientCounts(safe, caution, risky);
  }
}
package com.financeiro.casal.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String name;

    @Column(name = "avatar_url", columnDefinition = "text")
    private String avatarUrl;

    @Column(name = "salary")
    private Double salary;

    // --- Planejamento de orçamento (aba "Planejar") ---
    @Column(name = "housing_cost")
    private Double housingCost;

    @Column(name = "household_size")
    private Integer householdSize;

    @Column(name = "pays_food")
    private Boolean paysFood;

    @Column(name = "food_per_person")
    private Double foodPerPerson;

    @Column(name = "emergency_saved")
    private Double emergencySaved;

    @Column(name = "budget_uses_household_income")
    private Boolean budgetUsesHouseholdIncome;

    /** Limite mensal por categoria ("Mercado" → 900). */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_category_budgets", joinColumns = @JoinColumn(name = "user_id"))
    @MapKeyColumn(name = "category")
    @Column(name = "monthly_limit")
    private Map<String, Double> categoryBudgets;

    // --- Assistente (IA): provedor/modelo escolhidos e a chave do próprio usuário (cifrada) ---
    @Column(name = "ai_provider")
    private String aiProvider;

    @Column(name = "ai_model")
    private String aiModel;

    @Column(name = "ai_key_enc", columnDefinition = "text")
    private String aiKeyEnc;

    /** Fatos que o usuário contou ao assistente ("recebo dia 5"), reenviados a cada conversa. */
    @Column(name = "ai_notes", columnDefinition = "text")
    private String aiNotes;

    /** Telegram chat linked to this account (assistant over Telegram). */
    @Column(name = "telegram_chat_id", unique = true)
    private Long telegramChatId;

    @Column(name = "pin_hash")
    private String pinHash;

    @Column(name = "pin_enabled")
    private Boolean pinEnabled = false;

    @ElementCollection(fetch = FetchType.EAGER)
    private List<String> roles;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        List<String> effectiveRoles = (roles == null || roles.isEmpty()) ? List.of("USER") : roles;
        return effectiveRoles.stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                .toList();
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
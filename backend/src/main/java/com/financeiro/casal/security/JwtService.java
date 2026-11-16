package com.financeiro.casal.security;

import com.financeiro.casal.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.function.Function;

@Service
public class JwtService {

    // A session stays open until logout (the PIN guards the device); "trust 30 days" caps it on shared devices.
    static final long FOREVER_MS = 3650L * 24 * 60 * 60 * 1000;
    static final long TRUST_30_DAYS_MS = 30L * 24 * 60 * 60 * 1000;

    private final SecretKey key;

    public JwtService(@Value("${app.jwt.secret}") String secret) {
        // An empty/short secret would make tokens forgeable: refuse to start instead.
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET deve ter pelo menos 32 bytes");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
    }

    public String generateToken(User user) {
        return generateToken(user, false);
    }

    public String generateToken(User user, boolean only30Days) {
        long expirationMs = only30Days ? TRUST_30_DAYS_MS : FOREVER_MS;
        Date now = new Date();
        return Jwts.builder()
                .subject(user.getEmail())
                .claim("uid", user.getId())
                .claim("name", user.getName())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(key)
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public boolean isTokenValid(String token, User user) {
        try {
            return extractUsername(token).equals(user.getEmail()) && !isExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }

    private <T> T extractClaim(String token, Function<Claims, T> resolver) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return resolver.apply(claims);
    }
}

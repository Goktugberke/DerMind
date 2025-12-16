package com.dermind.DerMind.security;

import com.dermind.DerMind.error.UserNotAuthenticatedException;
import com.dermind.DerMind.user.repository.UserRepository;
import com.dermind.DerMind.user.model.User;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

@Service
public class CustomOAuth2UserService extends OidcUserService {

    private final UserRepository userRepository;
    private final CustomOAuth2UserService self;

    public CustomOAuth2UserService(
            UserRepository userRepository,
            @Lazy CustomOAuth2UserService self) {
        this.userRepository = userRepository;
        this.self = self;
    }

    @Override
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        OidcUser oidcUser = super.loadUser(userRequest);

        self.saveOrUpdateUser(oidcUser);

        return oidcUser;
    }

    @Transactional
    public void saveOrUpdateUser(OAuth2User oauth2User) {
        String id = oauth2User.getAttribute("sub");
        String name = oauth2User.getAttribute("name");
        String email = oauth2User.getAttribute("email");
        String picture = oauth2User.getAttribute("picture");

        Optional<User> existingUser = userRepository.findById(id);

        User user;
        if (existingUser.isPresent()) {
            user = existingUser.get();
            user.setName(name);
            user.setPicture(picture);
            user.setEmail(email);
        } else {
            user = new User();
            user.setId(id);
            user.setProviderId(id);
            user.setProvider("google");
            user.setEmail(email);
            user.setName(name);
            user.setPicture(picture);
        }

        userRepository.save(user);
    }

    public String currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UserNotAuthenticatedException();
        }
        if (authentication.getPrincipal() instanceof OidcUser oidcUser) {
            return oidcUser.getAttribute("sub");
        }
        throw new UserNotAuthenticatedException();
    }

    public String currentUserName() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UserNotAuthenticatedException();
        }

        if (!(authentication instanceof OAuth2AuthenticationToken oauthToken)) {
            throw new UserNotAuthenticatedException();
        }

        Object principal = oauthToken.getPrincipal();
        if (!(principal instanceof OidcUser oidcUser)) {
            throw new UserNotAuthenticatedException("Principal is not an OidcUser");
        }

        return oidcUser.getAttribute("name");
    }

    public String currentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UserNotAuthenticatedException();
        }

        if (!(authentication instanceof OAuth2AuthenticationToken oauthToken)) {
            throw new UserNotAuthenticatedException();
        }

        Object principal = oauthToken.getPrincipal();
        if (!(principal instanceof OidcUser oidcUser)) {
            throw new UserNotAuthenticatedException("Principal is not an OidcUser");
        }

        String email = oidcUser.getAttribute("email");
        if (email != null && !email.isEmpty()) {
            return email;
        }

        return oidcUser.getAttribute("preferred_username");
    }
}
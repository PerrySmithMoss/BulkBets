package store

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestIntegrationSessionRotationAndRevocation(t *testing.T) {
	f := integrationFixture(t, false)
	s := NewUsersStore(f.db)
	ctx := context.Background()
	user, err := s.GetUserByID(ctx, f.user.Id.String())
	if err != nil {
		t.Fatal(err)
	}
	if err = s.BeginSession(ctx, user); err != nil {
		t.Fatal(err)
	}
	stale := *user
	var successes atomic.Int32
	var wg sync.WaitGroup
	start := make(chan struct{})
	for range 16 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			_, err := s.RotateRefreshToken(ctx, user.Id.String(), user.RefreshTokenVersion, user.SessionVersion)
			if err == nil {
				successes.Add(1)
			} else if !errors.Is(err, ErrConflict) {
				t.Error(err)
			}
		}()
	}
	close(start)
	wg.Wait()
	if successes.Load() != 1 {
		t.Fatalf("expected exactly one rotation, got %d", successes.Load())
	}
	if err = s.RevokeSessions(ctx, user.Id.String()); err != nil {
		t.Fatal(err)
	}
	if _, err = s.RotateRefreshToken(ctx, user.Id.String(), user.RefreshTokenVersion+1, user.SessionVersion); !errors.Is(err, ErrConflict) {
		t.Fatalf("revoked refresh accepted: %v", err)
	}
	if err = s.BeginSession(ctx, &stale); !errors.Is(err, ErrConflict) {
		t.Fatalf("stale pre-reset login accepted: %v", err)
	}
	current, err := s.GetUserByID(ctx, user.Id.String())
	if err != nil {
		t.Fatal(err)
	}
	if current.SessionVersion <= stale.SessionVersion {
		t.Fatal("session was not revoked")
	}
}

func TestIntegrationOAuthCannotClaimPasswordAccount(t *testing.T) {
	f := integrationFixture(t, false)
	s := NewUsersStore(f.db)
	ctx := context.Background()
	f.exec(t, `UPDATE users SET password_hash='attacker-password-hash',is_email_verified=false WHERE id=$1`, f.user.Id)
	oauth := s.Builder().SetEmail(f.user.Id.String() + "@integration.invalid").SetFirstName("Verified").SetLastName("User").SetGoogleId("google-test-" + f.user.Id.String()).SetIsEmailVerified(true).SetEmailVerifiedAt(time.Now()).Build()
	if err := s.Upsert(ctx, oauth); !errors.Is(err, ErrIdentityLinkRequired) {
		t.Fatalf("unverified password account linked: %v", err)
	}
	var linked bool
	if err := f.db.QueryRow(`SELECT google_id IS NOT NULL FROM users WHERE id=$1`, f.user.Id).Scan(&linked); err != nil || linked {
		t.Fatalf("identity changed: linked=%v err=%v", linked, err)
	}
	// A previously linked, verified identity can still sign in.
	f.exec(t, `UPDATE users SET google_id=$2,is_email_verified=true,password_hash=NULL WHERE id=$1`, f.user.Id, *oauth.GoogleId)
	if err := s.Upsert(ctx, oauth); err != nil {
		t.Fatal(err)
	}
	if oauth.Id != f.user.Id {
		t.Fatal("existing Google identity was not retained")
	}
}

package store

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"testing"
)

func TestIntegrationPasswordResetCooldownAndSingleUse(t *testing.T) {
	f := integrationFixture(t, false)
	ctx := context.Background()
	var initialVersion int
	if err := f.db.QueryRow(`SELECT refresh_token_version FROM users WHERE id=$1`, f.user.Id).Scan(&initialVersion); err != nil {
		t.Fatal(err)
	}
	users := &UsersStore{db: f.db}
	digest := func(value string) string { sum := sha256.Sum256([]byte(value)); return hex.EncodeToString(sum[:]) }
	first, second := digest("first-test-reset-token"), digest("second-test-reset-token")
	created, err := users.SavePasswordReset(ctx, f.user.Id.String(), first)
	if err != nil || !created {
		t.Fatalf("initial reset: created=%v err=%v", created, err)
	}
	created, err = users.SavePasswordReset(ctx, f.user.Id.String(), second)
	if err != nil || created {
		t.Fatalf("cooldown: created=%v err=%v", created, err)
	}
	f.exec(t, `UPDATE password_resets SET created_at=NOW()-INTERVAL '2 minutes' WHERE user_id=$1`, f.user.Id)
	created, err = users.SavePasswordReset(ctx, f.user.Id.String(), second)
	if err != nil || !created {
		t.Fatalf("new reset after cooldown: created=%v err=%v", created, err)
	}
	if err := users.ResetPassword(ctx, first, "unused-test-hash"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("superseded token accepted: %v", err)
	}
	f.exec(t, `UPDATE password_resets SET expires_at=NOW()-INTERVAL '1 minute' WHERE user_id=$1`, f.user.Id)
	if err := users.ResetPassword(ctx, second, "unused-test-hash"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expired token accepted: %v", err)
	}
	f.exec(t, `UPDATE password_resets SET expires_at=NOW()+INTERVAL '30 minutes' WHERE user_id=$1`, f.user.Id)
	if err := users.ResetPassword(ctx, second, "replacement-test-hash"); err != nil {
		t.Fatal(err)
	}
	var hash string
	var version, sessionVersion int
	if err := f.db.QueryRow(`SELECT password_hash,refresh_token_version,session_version FROM users WHERE id=$1`, f.user.Id).Scan(&hash, &version, &sessionVersion); err != nil {
		t.Fatal(err)
	}
	if hash != "replacement-test-hash" || version != initialVersion+1 || sessionVersion != 1 {
		t.Fatal("reset did not update the password and revoke refresh sessions")
	}
	if err := users.ResetPassword(ctx, second, "reused-test-hash"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("reused token accepted: %v", err)
	}
}

package scraper

import (
	"context"
	"github.com/Timwal78/ago/recon-swarm/internal/models"
)

type Target struct {
	Source      string
	Queries     []string
	Subreddits  []string
	ChannelIDs  []string
}

func Execute(ctx context.Context, t Target, serpKey, discordToken string) ([]models.RawSignal, error) {
	return []models.RawSignal{}, nil
}

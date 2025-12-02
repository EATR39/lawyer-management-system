# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Dashboard Routes
Dashboard istatistikleri endpoint'i.
"""

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime, timedelta
from sqlalchemy import func
from app import db
from app.models import Client, Case, Transaction, Lead, CalendarEvent

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    """
    Dashboard istatistikleri
    """
    now = datetime.utcnow()
    today = now.date()
    month_start = today.replace(day=1)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)
    
    # Müvekkil istatistikleri
    total_clients = Client.query.count()
    active_clients = Client.query.filter_by(status='active').count()
    new_clients_this_month = Client.query.filter(
        Client.created_at >= month_start
    ).count()
    
    # Dava istatistikleri
    total_cases = Case.query.count()
    active_cases = Case.query.filter(Case.status.in_(['open', 'pending', 'in_progress'])).count()
    cases_won = Case.query.filter_by(status='won').count()
    cases_lost = Case.query.filter_by(status='lost').count()
    
    # Dava tiplerine göre dağılım
    cases_by_type = db.session.query(
        Case.case_type,
        func.count(Case.id).label('count')
    ).group_by(Case.case_type).all()
    
    # Finansal istatistikler
    total_income = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.transaction_type == 'income',
        Transaction.status == 'paid'
    ).scalar() or 0
    
    total_expense = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.transaction_type == 'expense',
        Transaction.status == 'paid'
    ).scalar() or 0
    
    # Bu ayki gelir
    monthly_income = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.transaction_type == 'income',
        Transaction.status == 'paid',
        Transaction.date >= month_start
    ).scalar() or 0
    
    # Bu ayki gider
    monthly_expense = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.transaction_type == 'expense',
        Transaction.status == 'paid',
        Transaction.date >= month_start
    ).scalar() or 0
    
    # Bekleyen ödemeler
    pending_payments = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.transaction_type == 'income',
        Transaction.status == 'pending'
    ).scalar() or 0
    
    # Lead istatistikleri
    total_leads = Lead.query.count()
    new_leads = Lead.query.filter_by(status='new').count()
    converted_leads = Lead.query.filter_by(status='converted').count()
    leads_needing_follow_up = Lead.query.filter(
        Lead.follow_up_date <= today,
        Lead.status.notin_(['converted', 'lost'])
    ).count()
    
    # Yaklaşan etkinlikler (7 gün içinde)
    upcoming_events = CalendarEvent.query.filter(
        CalendarEvent.start_datetime >= now,
        CalendarEvent.start_datetime <= now + timedelta(days=7),
        CalendarEvent.status == 'scheduled'
    ).order_by(CalendarEvent.start_datetime.asc()).limit(5).all()
    
    # Yaklaşan duruşmalar
    upcoming_hearings = CalendarEvent.query.filter(
        CalendarEvent.event_type == 'hearing',
        CalendarEvent.start_datetime >= now,
        CalendarEvent.status == 'scheduled'
    ).order_by(CalendarEvent.start_datetime.asc()).limit(5).all()
    
    # Aylık gelir trendi (son 6 ay)
    monthly_income_trend = []
    for i in range(5, -1, -1):
        month_date = today - timedelta(days=30 * i)
        month_start_date = month_date.replace(day=1)
        if month_date.month == 12:
            month_end_date = month_start_date.replace(year=month_date.year + 1, month=1) - timedelta(days=1)
        else:
            month_end_date = month_start_date.replace(month=month_date.month + 1) - timedelta(days=1)
        
        income = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.transaction_type == 'income',
            Transaction.status == 'paid',
            Transaction.date >= month_start_date,
            Transaction.date <= month_end_date
        ).scalar() or 0
        
        monthly_income_trend.append({
            'month': month_start_date.strftime('%Y-%m'),
            'income': float(income)
        })
    
    return jsonify({
        'clients': {
            'total': total_clients,
            'active': active_clients,
            'new_this_month': new_clients_this_month
        },
        'cases': {
            'total': total_cases,
            'active': active_cases,
            'won': cases_won,
            'lost': cases_lost,
            'by_type': [
                {'type': t, 'count': c, 'type_display': Case.CASE_TYPES.get(t, t)} 
                for t, c in cases_by_type
            ]
        },
        'finance': {
            'total_income': float(total_income),
            'total_expense': float(total_expense),
            'net_profit': float(total_income - total_expense),
            'monthly_income': float(monthly_income),
            'monthly_expense': float(monthly_expense),
            'pending_payments': float(pending_payments),
            'monthly_trend': monthly_income_trend
        },
        'leads': {
            'total': total_leads,
            'new': new_leads,
            'converted': converted_leads,
            'needs_follow_up': leads_needing_follow_up
        },
        'upcoming_events': [e.to_dict() for e in upcoming_events],
        'upcoming_hearings': [h.to_dict() for h in upcoming_hearings]
    }), 200

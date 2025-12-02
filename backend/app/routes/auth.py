# -*- coding: utf-8 -*-
"""
Avukat Yönetim Sistemi - Kimlik Doğrulama Routes
Login, logout, token refresh ve kullanıcı bilgileri endpoint'leri.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
)
from app import db
from app.models import User

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Kullanıcı girişi
    
    Request Body:
        email: E-posta adresi
        password: Şifre
    
    Returns:
        access_token: JWT access token
        refresh_token: JWT refresh token
        user: Kullanıcı bilgileri
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'message': 'Geçersiz istek verisi'}), 400
    
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'message': 'E-posta ve şifre gereklidir'}), 400
    
    # Kullanıcıyı bul
    user = User.query.filter_by(email=email).first()
    
    if not user or not user.check_password(password):
        return jsonify({'message': 'Geçersiz e-posta veya şifre'}), 401
    
    if not user.is_active:
        return jsonify({'message': 'Hesabınız devre dışı bırakılmış'}), 401
    
    # Token'ları oluştur
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    
    return jsonify({
        'message': 'Giriş başarılı',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    Kullanıcı çıkışı
    Not: JWT stateless olduğu için sunucu tarafında bir işlem yapmıyoruz.
    Client tarafında token silinmeli.
    """
    return jsonify({'message': 'Çıkış başarılı'}), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """
    Access token yenileme
    
    Returns:
        access_token: Yeni JWT access token
    """
    current_user_id = get_jwt_identity()
    
    # Kullanıcının hala aktif olduğunu kontrol et
    user = User.query.get(current_user_id)
    if not user or not user.is_active:
        return jsonify({'message': 'Kullanıcı bulunamadı veya devre dışı'}), 401
    
    access_token = create_access_token(identity=current_user_id)
    
    return jsonify({
        'access_token': access_token
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """
    Mevcut kullanıcı bilgilerini döndürür
    
    Returns:
        user: Kullanıcı bilgileri
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'message': 'Kullanıcı bulunamadı'}), 404
    
    return jsonify({
        'user': user.to_dict()
    }), 200


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """
    Şifre değiştirme
    
    Request Body:
        current_password: Mevcut şifre
        new_password: Yeni şifre
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'message': 'Kullanıcı bulunamadı'}), 404
    
    data = request.get_json()
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    
    if not current_password or not new_password:
        return jsonify({'message': 'Mevcut ve yeni şifre gereklidir'}), 400
    
    if not user.check_password(current_password):
        return jsonify({'message': 'Mevcut şifre hatalı'}), 400
    
    if len(new_password) < 6:
        return jsonify({'message': 'Yeni şifre en az 6 karakter olmalıdır'}), 400
    
    user.set_password(new_password)
    db.session.commit()
    
    return jsonify({'message': 'Şifre başarıyla değiştirildi'}), 200
